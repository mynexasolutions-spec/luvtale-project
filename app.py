# =============================================================================
# Luvtale Boutique — Flask admin + API (PERFORMANCE-OPTIMIZED BUILD)
#
# What changed vs. the previous version and WHY (see OPTIMIZATION_NOTES.md):
#
#   1. Images now upload DIRECTLY from the browser to Cloudinary using a short-
#      lived signed payload (/admin/cloudinary-sign). The Flask server never
#      touches the image bytes — it only receives small URL strings. This removes
#      the "double hop" (browser -> Flask -> Cloudinary) that dominated save time.
#      The old multipart flow still works as a fallback (JS disabled).
#   2. Cloudinary deletions are batched (delete_resources) and run on a BACKGROUND
#      THREAD after the commit, so they add ~0 ms to the save response.
#   3. Variations are DIFFED on edit (update-in-place / insert new / delete
#      removed) instead of "delete everything, re-create everything". Variation
#      IDs stay stable (existing carts keep working) and writes are minimal.
#   4. ONE commit per save (previously 3+).
#   5. Slug uniqueness is only checked when the slug actually changed.
#   6. Missing FK indexes are created at startup (faster joins/cascades).
#   7. Admin notification context processor cached for 15 s (was 3 queries on
#      every admin page render).
#   8. Step-level profiler built in: save with ?profile=1 (or set REQUEST_TIMING=1)
#      and the server log shows exactly where the milliseconds went.
#   9. Bug fix: seeded admin + admin-created customers now get HASHED passwords.
# =============================================================================

from flask import Flask, render_template, session, redirect, url_for, request, jsonify, flash
from functools import wraps
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename  # noqa: F401  (kept for template/scripts compat)
import os
import re
import json
import time
import secrets
import random
import threading
import markdown
from datetime import datetime
import cloudinary
import cloudinary.uploader
import cloudinary.api
import cloudinary.utils
from dotenv import load_dotenv
from sqlalchemy.orm import joinedload, subqueryload
from concurrent.futures import ThreadPoolExecutor

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'luvtale_secret_key')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# Connection pool: pre-ping avoids "server closed the connection" stalls on
# Neon/Supabase-style managed Postgres; recycle avoids stale-idle sockets.
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_size': 10,
    'max_overflow': 20,
    'pool_pre_ping': True,
    'pool_recycle': 300,
}
# Hard cap for the legacy multipart fallback (direct uploads bypass this).
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024

# Public URL of the Next.js customer frontend, which now owns all customer-facing pages.
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3001')

# Set REQUEST_TIMING=1 to log every request's server-side time.
REQUEST_TIMING = os.environ.get('REQUEST_TIMING') == '1'

# Cloudinary Config
cloudinary.config(
    cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
    api_key=os.environ.get('CLOUDINARY_API_KEY'),
    api_secret=os.environ.get('CLOUDINARY_API_SECRET'),
    secure=True
)

db = SQLAlchemy(app)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

# Incoming transformation applied by Cloudinary on upload: caps dimensions and
# normalizes encoding. This replaces any client/server-side compression work —
# Cloudinary does it at upload time for free.
UPLOAD_TRANSFORMATION = 'c_limit,w_2000,q_auto:good,f_auto'
UPLOAD_FOLDER = os.environ.get('CLOUDINARY_FOLDER', 'luvtale/products')


# -----------------------------------------------------------------------------
# Request timing + step profiler (identify the bottleneck with real numbers)
# -----------------------------------------------------------------------------
@app.before_request
def _timing_start():
    request._started_at = time.perf_counter()


class StepTimer:
    """Tiny step profiler. Usage:
        t = StepTimer('edit #5', enabled=True); t.mark('parsed form') ...; t.report()
    Prints per-step ms deltas to the app log."""
    __slots__ = ('label', 'enabled', 'start', 'last', 'marks')

    def __init__(self, label, enabled=False):
        self.label = label
        self.enabled = enabled
        self.start = self.last = time.perf_counter()
        self.marks = []

    def mark(self, name):
        now = time.perf_counter()
        self.marks.append((name, (now - self.last) * 1000.0, (now - self.start) * 1000.0))
        self.last = now

    def report(self):
        if not self.enabled:
            return
        lines = [f'--- SAVE PROFILE [{self.label}] ---']
        for name, delta, total in self.marks:
            lines.append(f'  {delta:9.1f} ms  (total {total:9.1f} ms)  {name}')
        app.logger.info('\n'.join(lines))


# -----------------------------------------------------------------------------
# Cloudinary helpers
# -----------------------------------------------------------------------------
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def extract_public_id(url):
    """Extract the Cloudinary public_id (with folder, without version/extension)
    from a delivery URL. Returns None for non-Cloudinary or unparsable URLs."""
    if not url or 'cloudinary' not in url:
        return None
    m = re.search(r'/upload/(?:v\d+/)?(.+?)(?:\.[a-zA-Z0-9]+)?$', url)
    return m.group(1) if m else None


def save_file(file):
    """Synchronous single-file upload (still used by category/brand forms and
    the public /api/user product endpoints)."""
    if file and allowed_file(file.filename):
        try:
            upload_result = cloudinary.uploader.upload(file, folder=UPLOAD_FOLDER)
            return upload_result['secure_url']
        except Exception as e:
            app.logger.warning(f'Cloudinary upload error: {e}')
            return None
    return None


def upload_files_parallel(tasks):
    """Legacy fallback path: server-side parallel uploads. Only used when the
    browser posts multipart files directly (JS disabled)."""
    valid_tasks = [(identifier, f) for identifier, f in tasks if f and allowed_file(getattr(f, 'filename', ''))]
    if not valid_tasks:
        return {}

    def upload_one(task):
        identifier, f = task
        try:
            upload_result = cloudinary.uploader.upload(f, folder=UPLOAD_FOLDER)
            return identifier, upload_result['secure_url']
        except Exception as e:
            app.logger.warning(f'Cloudinary upload error for {identifier}: {e}')
            return identifier, None

    results = {}
    with ThreadPoolExecutor(max_workers=min(len(valid_tasks), 10)) as executor:
        for identifier, url in executor.map(upload_one, valid_tasks):
            if url:
                results[identifier] = url
    return results


def delete_file(url):
    url = url if isinstance(url, str) else None
    public_id = extract_public_id(url)
    if not public_id:
        return
    try:
        cloudinary.uploader.destroy(public_id)
    except Exception as e:
        app.logger.warning(f'Cloudinary delete error: {e}')


def delete_files_async(urls):
    """Batch-delete Cloudinary assets on a background thread AFTER the DB commit.
    Adds ~0 ms to the request/response cycle. One API call per 100 assets."""
    public_ids = []
    for u in urls:
        pid = extract_public_id(u)
        if pid:
            public_ids.append(pid)
    if not public_ids:
        return

    def _run(ids):
        try:
            for i in range(0, len(ids), 100):
                cloudinary.api.delete_resources(ids[i:i + 100])
        except Exception as e:
            app.logger.warning(f'Cloudinary batch delete error: {e}')

    threading.Thread(target=_run, args=(public_ids,), daemon=True).start()


def _signed_upload_params():
    timestamp = int(time.time())
    params = {
        'timestamp': timestamp,
        'folder': UPLOAD_FOLDER,
        'transformation': UPLOAD_TRANSFORMATION,
    }
    cfg = cloudinary.config()
    params['signature'] = cloudinary.utils.api_sign_request(params, cfg.api_secret)
    params['api_key'] = cfg.api_key
    params['cloud_name'] = cfg.cloud_name
    return params


# --- MODELS (unchanged schema) ---

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), default='user')  # 'admin' or 'user'
    email = db.Column(db.String(150))
    phone = db.Column(db.String(20))
    address = db.Column(db.Text)


class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    img = db.Column(db.String(255))
    bg = db.Column(db.String(50))
    items_count = db.Column(db.Integer, default=0)
    is_hot = db.Column(db.Boolean, default=False)
    is_new = db.Column(db.Boolean, default=False)
    subcategories = db.relationship('SubCategory', backref='category', lazy=True, cascade="all, delete-orphan")
    products = db.relationship('Product', backref='category', lazy=True)


class SubCategory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('category.id'), nullable=False)


product_subcategories = db.Table('product_subcategories',
    db.Column('product_id', db.Integer, db.ForeignKey('product.id'), primary_key=True),
    db.Column('subcategory_id', db.Integer, db.ForeignKey('sub_category.id'), primary_key=True)
)


class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    slug = db.Column(db.String(250), unique=True, nullable=True)
    price = db.Column(db.Float, nullable=False)
    old_price = db.Column(db.Float)
    badge = db.Column(db.String(50))
    img_primary = db.Column(db.String(512))
    img_secondary = db.Column(db.String(512))
    description = db.Column(db.Text)
    category_id = db.Column(db.Integer, db.ForeignKey('category.id'), nullable=True)
    brand_id = db.Column(db.Integer, db.ForeignKey('brand.id'), nullable=True)
    product_type = db.Column(db.String(20), default='simple')  # 'simple' or 'variable'
    stock_status = db.Column(db.String(20), default='instock')
    is_featured = db.Column(db.Boolean, default=False)
    is_trending = db.Column(db.Boolean, default=False)
    is_bestseller = db.Column(db.Boolean, default=False)
    rating = db.Column(db.Integer, default=5)
    stock_count = db.Column(db.Integer, default=0)
    size_chart = db.Column(db.String(512))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    user = db.relationship('User', backref=db.backref('uploaded_products', lazy=True))

    subcategories = db.relationship('SubCategory', secondary=product_subcategories, backref='products_list', lazy=True)
    variations = db.relationship('ProductVariation', backref='product', lazy=True, cascade="all, delete-orphan")
    product_attributes = db.relationship('ProductAttribute', backref='product', lazy=True, cascade="all, delete-orphan")
    images = db.relationship('ProductImage', backref='product', lazy=True, cascade="all, delete-orphan")


def slugify(text):
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    return text.strip('-')


def generate_unique_slug(name, product_id=None):
    base_slug = slugify(name)
    if not base_slug:
        base_slug = "product"
    slug = base_slug
    counter = 1
    while True:
        query = Product.query.filter(Product.slug == slug)
        if product_id:
            query = query.filter(Product.id != product_id)
        if not query.first():
            break
        slug = f"{base_slug}-{counter}"
        counter += 1
    return slug


class ProductVariation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    price = db.Column(db.Float)
    stock_count = db.Column(db.Integer, default=0)
    stock_status = db.Column(db.String(20), default='instock')
    sku = db.Column(db.String(50))
    img_primary = db.Column(db.String(512))
    images = db.relationship('ProductImage', backref='variation', lazy=True, cascade="all, delete-orphan")


class Attribute(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    slug = db.Column(db.String(100))
    type = db.Column(db.String(50), default='select')  # 'select', 'color'
    values = db.relationship('AttributeValue', backref='attribute', lazy=True, cascade="all, delete-orphan")


class AttributeValue(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    attribute_id = db.Column(db.Integer, db.ForeignKey('attribute.id'), nullable=False)
    value = db.Column(db.String(100), nullable=False)


class ProductAttribute(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    attribute_id = db.Column(db.Integer, db.ForeignKey('attribute.id'), nullable=False)
    attribute = db.relationship('Attribute', lazy=True)


class VariationOption(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    variation_id = db.Column(db.Integer, db.ForeignKey('product_variation.id'), nullable=False)
    attribute_value_id = db.Column(db.Integer, db.ForeignKey('attribute_value.id'), nullable=False)
    variation = db.relationship('ProductVariation', backref=db.backref('options', lazy=True, cascade="all, delete-orphan"))
    attribute_value = db.relationship('AttributeValue', backref='variation_options', lazy=True)


class ProductImage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=True)
    variation_id = db.Column(db.Integer, db.ForeignKey('product_variation.id'), nullable=True)
    img_url = db.Column(db.String(512), nullable=False)


class Brand(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    logo = db.Column(db.String(512))


class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    order_number = db.Column(db.String(50), unique=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    total_amount = db.Column(db.Float)
    status = db.Column(db.String(20), default='Pending')
    date = db.Column(db.DateTime, default=datetime.utcnow)
    payment_method = db.Column(db.String(50), default='Card')
    return_exchange_type = db.Column(db.String(50), nullable=True)
    return_exchange_reason = db.Column(db.Text, nullable=True)
    return_exchange_status = db.Column(db.String(50), nullable=True)
    user = db.relationship('User', backref=db.backref('orders_list', lazy=True))

    @property
    def username(self):
        return self.user.username if self.user else "Guest"


class Subscription(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(150), unique=True, nullable=False)


class Review(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'))
    customer_name = db.Column(db.String(100))
    rating = db.Column(db.Integer)
    comment = db.Column(db.Text)


class Coupon(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), unique=True)
    discount_type = db.Column(db.String(20), default='Percentage')  # 'Percentage' or 'Flat'
    discount_value = db.Column(db.Float)
    threshold = db.Column(db.Float, default=0.0)
    max_usage = db.Column(db.Integer, default=1)
    expiry_date = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)


# --- ADMIN DECORATOR ---

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('admin_logged_in') and session.get('user_role') != 'admin':
            return redirect(url_for('admin_login'))
        return f(*args, **kwargs)
    return decorated_function


# --- ADMIN NOTIFICATIONS (cached 15s: was 3 queries on EVERY admin page render) ---
_NOTIF_CACHE = {'ts': 0.0, 'payload': {'admin_notifications': [], 'notif_count': 0}}
_NOTIF_TTL = 15.0


def _build_admin_notifications():
    notifications = []
    low_stock = Product.query.filter(Product.stock_count < 5).order_by(Product.stock_count.asc()).limit(3).all()
    for p in low_stock:
        notifications.append({
            'type': 'stock',
            'title': 'Low Stock Alert',
            'message': f'"{p.name}" is running low ({p.stock_count} left)',
            'time': 'Action Required',
            'bg': '#FFF5F5'
        })
    recent_orders = Order.query.order_by(Order.date.desc()).limit(2).all()
    for o in recent_orders:
        notifications.append({
            'type': 'order',
            'title': f'New Order #{o.order_number}',
            'message': f'Total amount: ₹{o.total_amount}',
            'time': o.date.strftime('%d %b, %H:%M'),
            'bg': '#FDE2E7'
        })
    recent_reviews = Review.query.order_by(Review.id.desc()).limit(2).all()
    for r in recent_reviews:
        notifications.append({
            'type': 'review',
            'title': 'New Review',
            'message': f'{r.customer_name} left a {r.rating}-star review',
            'time': 'Just now',
            'bg': '#F8F9FB'
        })
    return {'admin_notifications': notifications[:5], 'notif_count': len(notifications)}


@app.context_processor
def inject_admin_notifications():
    if not session.get('admin_logged_in'):
        return {'admin_notifications': [], 'notif_count': 0}
    now = time.monotonic()
    if now - _NOTIF_CACHE['ts'] > _NOTIF_TTL:
        _NOTIF_CACHE['payload'] = _build_admin_notifications()
        _NOTIF_CACHE['ts'] = now
    return _NOTIF_CACHE['payload']


# --- CSRF PROTECTION (double-submit cookie, scoped to /api/*) ---
CSRF_SAFE_METHODS = {'GET', 'HEAD', 'OPTIONS'}


@app.before_request
def ensure_csrf_token():
    if 'csrf_token' not in session:
        session['csrf_token'] = secrets.token_hex(16)


@app.before_request
def enforce_csrf():
    if (request.path.startswith('/api/')
            and not request.path.startswith('/api/admin/')
            and request.method not in CSRF_SAFE_METHODS):
        sent = request.headers.get('X-CSRFToken')
        if not sent or sent != session.get('csrf_token'):
            return jsonify({'success': False, 'message': 'Invalid or missing CSRF token'}), 403


@app.after_request
def set_csrf_cookie(response):
    token = session.get('csrf_token')
    if token:
        response.set_cookie('csrf_token', token, httponly=False, samesite='Lax')
    if REQUEST_TIMING and hasattr(request, '_started_at'):
        app.logger.info(f'{request.method} {request.path} -> {response.status_code} '
                        f'in {(time.perf_counter() - request._started_at) * 1000:.1f} ms')
    return response


# --- SERIALIZERS ---

def serialize_product_card(p):
    return {
        'id': p.id,
        'name': p.name,
        'slug': p.slug,
        'price': p.price,
        'old_price': p.old_price,
        'badge': p.badge,
        'img_primary': p.img_primary,
        'img_secondary': p.img_secondary,
        'rating': p.rating,
        'stock_status': p.stock_status,
        'category_name': p.category.name if p.category else None,
    }


def serialize_category(c):
    return {
        'id': c.id,
        'name': c.name,
        'img': c.img,
        'bg': c.bg,
        'items_count': c.items_count,
        'is_hot': c.is_hot,
        'is_new': c.is_new,
        'subcategories': [{'id': s.id, 'name': s.name} for s in c.subcategories],
    }


def serialize_user(u):
    return {
        'id': u.id,
        'username': u.username,
        'role': u.role,
        'email': u.email or '',
        'phone': u.phone or '',
        'address': u.address or '',
    }


# --- API ROUTES ---

@app.route('/api/categories')
def api_categories():
    categories = Category.query.all()
    return jsonify([serialize_category(c) for c in categories])


@app.route('/api/home')
def api_home():
    trending_products = Product.query.filter_by(is_trending=True).order_by(Product.id.desc()).limit(8).all()
    bestseller_products = Product.query.filter_by(is_bestseller=True).order_by(Product.id.desc()).limit(8).all()
    featured_products = Product.query.filter_by(is_featured=True).order_by(Product.id.desc()).limit(8).all()

    if not trending_products:
        trending_products = Product.query.order_by(Product.id.desc()).limit(8).all()
    if not bestseller_products:
        bestseller_products = Product.query.order_by(Product.id.desc()).limit(8).all()
    if not featured_products:
        featured_products = Product.query.order_by(Product.id.desc()).limit(8).all()

    reviews = Review.query.all()

    return jsonify({
        'trending_products': [serialize_product_card(p) for p in trending_products],
        'bestseller_products': [serialize_product_card(p) for p in bestseller_products],
        'featured_products': [serialize_product_card(p) for p in featured_products],
        'reviews': [{'id': r.id, 'customer_name': r.customer_name, 'rating': r.rating, 'comment': r.comment} for r in reviews],
    })


@app.route('/api/shop')
def api_shop():
    category_ids = request.args.getlist('category', type=int)
    subcategory_ids = request.args.getlist('subcategory', type=int)
    collections = request.args.getlist('collection')
    min_price = request.args.get('min_price', type=float)
    max_price = request.args.get('max_price', type=float)
    sort = request.args.get('sort')

    query = Product.query

    if category_ids:
        query = query.filter(Product.category_id.in_(category_ids))
    if subcategory_ids:
        query = query.join(Product.subcategories).filter(SubCategory.id.in_(subcategory_ids))
    if collections:
        from sqlalchemy import or_
        collection_filters = []
        if 'trending' in collections:
            collection_filters.append(Product.is_trending == True)
        if 'bestseller' in collections:
            collection_filters.append(Product.is_bestseller == True)
        if 'featured' in collections:
            collection_filters.append(Product.is_featured == True)
        if collection_filters:
            query = query.filter(or_(*collection_filters))
    if min_price is not None:
        query = query.filter(Product.price >= min_price)
    if max_price is not None:
        query = query.filter(Product.price <= max_price)

    if sort == 'low':
        query = query.order_by(Product.price.asc())
    elif sort == 'high':
        query = query.order_by(Product.price.desc())
    else:
        query = query.order_by(Product.id.desc())

    products = query.all()

    return jsonify({
        'products': [serialize_product_card(p) for p in products],
        'category_ids': category_ids,
        'subcategory_ids': subcategory_ids,
    })


@app.route('/api/product-detail/<slug>')
def api_product_detail(slug):
    product = Product.query.filter_by(slug=slug).options(
        subqueryload(Product.variations).options(
            joinedload(ProductVariation.options).options(
                joinedload(VariationOption.attribute_value).options(
                    joinedload(AttributeValue.attribute)
                )
            ),
            subqueryload(ProductVariation.images)
        ),
        subqueryload(Product.product_attributes).options(
            joinedload(ProductAttribute.attribute).options(
                subqueryload(Attribute.values)
            )
        ),
        subqueryload(Product.images)
    ).first()

    if not product:
        return jsonify({'success': False, 'message': 'Product not found'}), 404

    variation_id = request.args.get('v', type=int)
    current_variation = ProductVariation.query.get(variation_id) if variation_id else None

    reviews = Review.query.filter_by(product_id=product.id).all()

    related_products = []
    if product.category_id:
        related_products = Product.query.filter(
            Product.category_id == product.category_id,
            Product.id != product.id
        ).order_by(Product.id.desc()).limit(4).all()

    variations = []
    for v in product.variations:
        variations.append({
            'id': v.id,
            'price': v.price,
            'stock_count': v.stock_count,
            'stock_status': v.stock_status,
            'sku': v.sku,
            'img_primary': v.img_primary,
            'images': [img.img_url for img in v.images],
            'options': [
                {
                    'attribute_id': o.attribute_value.attribute_id,
                    'attribute': o.attribute_value.attribute.name,
                    'attribute_value_id': o.attribute_value_id,
                    'value': o.attribute_value.value,
                } for o in v.options
            ],
        })

    description_raw = product.description or (
        "Elevate your wardrobe with this exquisite piece. Crafted with the finest materials and an "
        "eye for timeless detail, this selection from Luvtale Boutique defines modern luxury and sophistication."
    )

    attributes = []
    if product.product_type == 'variable':
        for pa in product.product_attributes:
            attr = pa.attribute
            used_value_ids = set()
            for v in product.variations:
                for opt in v.options:
                    if opt.attribute_value.attribute_id == attr.id:
                        used_value_ids.add(opt.attribute_value_id)
            attributes.append({
                'id': attr.id,
                'name': attr.name,
                'values': [
                    {'id': val.id, 'value': val.value}
                    for val in attr.values if val.id in used_value_ids
                ],
            })

    return jsonify({
        'product': {
            **serialize_product_card(product),
            'description_html': markdown.markdown(description_raw, extensions=['tables']),
            'product_type': product.product_type,
            'stock_count': product.stock_count,
            'size_chart': product.size_chart,
            'category_id': product.category_id,
            'img_secondary': product.img_secondary,
            'images': [img.img_url for img in product.images if not img.variation_id],
            'variations': variations,
            'attributes': attributes,
        },
        'current_variation_id': current_variation.id if current_variation else None,
        'reviews': [{'id': r.id, 'customer_name': r.customer_name, 'rating': r.rating, 'comment': r.comment} for r in reviews],
        'related_products': [serialize_product_card(p) for p in related_products],
    })


@app.route('/api/auth/session')
def api_auth_session():
    user = User.query.get(session['user_id']) if session.get('user_id') else None
    return jsonify({'user': serialize_user(user) if user else None})


@app.route('/api/auth/login', methods=['POST'])
def api_auth_login():
    data = request.get_json() or {}
    username = data.get('username', '')
    password = data.get('password', '')

    user = User.query.filter_by(username=username).first()
    if not user or not check_password_hash(user.password, password):
        return jsonify({'success': False, 'message': 'Invalid username or password.'}), 401

    session['user_id'] = user.id
    session['username'] = user.username
    session['user_role'] = user.role
    session['admin_logged_in'] = user.role == 'admin'
    return jsonify({'success': True, 'user': serialize_user(user)})


@app.route('/api/auth/signup', methods=['POST'])
def api_auth_signup():
    data = request.get_json() or {}
    username = data.get('username', '')
    password = data.get('password', '')
    confirm_password = data.get('confirm_password', '')

    if not username or not password:
        return jsonify({'success': False, 'message': 'Username and password are required.'}), 400
    if password != confirm_password:
        return jsonify({'success': False, 'message': 'Passwords do not match.'}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({'success': False, 'message': 'Username already exists.'}), 400

    new_user = User(username=username, password=generate_password_hash(password))
    db.session.add(new_user)
    db.session.commit()
    return jsonify({'success': True})


@app.route('/api/auth/logout', methods=['POST'])
def api_auth_logout():
    session.clear()
    return jsonify({'success': True})


@app.route('/api/auth/profile', methods=['GET', 'POST'])
def api_auth_profile():
    if not session.get('user_id'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    user = User.query.get(session['user_id'])
    if request.method == 'POST':
        data = request.get_json() or {}
        user.email = data.get('email', user.email)
        user.phone = data.get('phone', user.phone)
        user.address = data.get('address', user.address)
        db.session.commit()

    orders = Order.query.filter_by(user_id=user.id).order_by(Order.date.desc()).all()
    return jsonify({
        'user': serialize_user(user),
        'orders': [{
            'id': o.id,
            'order_number': o.order_number,
            'total_amount': o.total_amount,
            'status': o.status,
            'date': o.date.isoformat(),
            'payment_method': o.payment_method,
            'return_exchange_type': o.return_exchange_type,
            'return_exchange_reason': o.return_exchange_reason,
            'return_exchange_status': o.return_exchange_status,
        } for o in orders],
    })


@app.route('/api/product/<int:id>')
def get_product_api(id):
    product = Product.query.get_or_404(id)
    return jsonify({
        'id': product.id,
        'name': product.name,
        'slug': product.slug,
        'price': product.price,
        'description': product.description,
        'img_primary': product.img_primary,
        'badge': product.badge
    })


@app.route('/api/search')
def search_api():
    query = request.args.get('q', '')
    if not query:
        return jsonify([])
    products = Product.query.filter(Product.name.ilike(f'%{query}%')).limit(5).all()
    return jsonify([{
        'id': p.id,
        'name': p.name,
        'slug': p.slug,
        'price': p.price,
        'img': p.img_primary
    } for p in products])


# --- USER ROUTES ---

@app.route('/')
def home():
    return redirect(FRONTEND_URL)


@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if session.get('admin_logged_in'):
        return redirect(url_for('admin_dashboard'))

    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        user = User.query.filter_by(username=username).first()
        if user and user.role == 'admin' and check_password_hash(user.password, password):
            session['user_id'] = user.id
            session['username'] = user.username
            session['user_role'] = user.role
            session['admin_logged_in'] = True
            flash('Login successful!', 'success')
            return redirect(url_for('admin_dashboard'))
        flash('Invalid admin ID or password.', 'error')
    return render_template('admin/login.html')


# --- ADMIN ROUTES ---

@app.route('/admin')
@admin_required
def admin_dashboard():
    counts = db.session.execute(
        text('SELECT (SELECT COUNT(*) FROM "order") AS orders, (SELECT COUNT(*) FROM "user") AS customers, (SELECT COUNT(*) FROM product) AS products')
    ).fetchone()
    stats = {
        'total_sales': '₹1,24,500',
        'orders_count': counts[0],
        'customers_count': counts[1],
        'active_products': counts[2]
    }
    recent_orders = Order.query.order_by(Order.date.desc()).limit(5).all()
    low_stock_products = Product.query.filter(Product.stock_count < 10).limit(5).all()
    return render_template('admin/dashboard.html', stats=stats, recent_orders=recent_orders, low_stock=low_stock_products)


@app.route('/admin/products')
@admin_required
def admin_products():
    category_ids = request.args.getlist('category', type=int)
    subcategory_ids = request.args.getlist('subcategory', type=int)
    page = request.args.get('page', 1, type=int)
    per_page = 20

    query = Product.query.order_by(Product.id.desc())

    if category_ids:
        query = query.filter(Product.category_id.in_(category_ids))
    if subcategory_ids:
        query = query.join(Product.subcategories).filter(SubCategory.id.in_(subcategory_ids))

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    products = pagination.items
    categories = Category.query.all()
    subcategories = SubCategory.query.all()
    return render_template('admin/products.html', products=products, categories=categories, subcategories=subcategories,
                           category_ids=category_ids, subcategory_ids=subcategory_ids, pagination=pagination)


@app.route('/admin/categories')
@admin_required
def admin_categories():
    categories = Category.query.all()
    return render_template('admin/categories.html', categories=categories)


@app.route('/admin/brands')
@admin_required
def admin_brands():
    brands = Brand.query.all()
    return render_template('admin/brands.html', brands=brands)


@app.route('/admin/attributes')
@admin_required
def admin_attributes():
    attributes = Attribute.query.all()
    attr_data = []
    for attr in attributes:
        total_stock = 0
        value_ids = [v.id for v in attr.values]
        if value_ids:
            total_stock = db.session.query(db.func.sum(ProductVariation.stock_count))\
                .join(VariationOption)\
                .filter(VariationOption.attribute_value_id.in_(value_ids))\
                .scalar() or 0
        attr_data.append({
            'attr': attr,
            'total_stock': total_stock,
            'values_str': ", ".join([v.value for v in attr.values])
        })
    return render_template('admin/attributes.html', attributes=attr_data)


@app.route('/admin/orders')
@admin_required
def admin_orders():
    orders = Order.query.all()
    return render_template('admin/orders.html', orders=orders)


@app.route('/admin/customers')
@admin_required
def admin_customers():
    customers = User.query.all()
    return render_template('admin/customers.html', customers=customers)


@app.route('/admin/reviews')
@admin_required
def admin_reviews():
    reviews = Review.query.all()
    return render_template('admin/reviews.html', reviews=reviews)


@app.route('/admin/coupons')
@admin_required
def admin_coupons():
    coupons = Coupon.query.all()
    return render_template('admin/coupons.html', coupons=coupons)


@app.route('/admin/coupons/add', methods=['GET', 'POST'])
@admin_required
def admin_add_coupon():
    if request.method == 'POST':
        code = request.form.get('code')
        discount_type = request.form.get('discount_type')
        discount_value = float(request.form.get('discount_value') or 0)
        threshold = float(request.form.get('threshold') or 0)
        max_usage = int(request.form.get('max_usage') or 1)
        expiry_str = request.form.get('expiry_date')
        expiry_date = datetime.strptime(expiry_str, '%Y-%m-%d') if expiry_str else None
        is_active = 'is_active' in request.form

        new_coupon = Coupon(
            code=code,
            discount_type=discount_type,
            discount_value=discount_value,
            threshold=threshold,
            max_usage=max_usage,
            expiry_date=expiry_date,
            is_active=is_active
        )
        db.session.add(new_coupon)
        db.session.commit()
        flash('Coupon created!', 'success')
        return redirect(url_for('admin_coupons'))
    return render_template('admin/coupon_form.html', title="Create Coupon")


@app.route('/admin/coupons/delete/<int:id>')
@admin_required
def admin_delete_coupon(id):
    coupon = Coupon.query.get_or_404(id)
    db.session.delete(coupon)
    db.session.commit()
    flash('Coupon deleted!', 'info')
    return redirect(url_for('admin_coupons'))


@app.route('/admin/settings')
@admin_required
def admin_settings():
    return render_template('admin/settings.html')


@app.route('/admin/profile')
@admin_required
def admin_profile():
    return render_template('admin/profile.html')


@app.route('/admin/logout')
def admin_logout():
    session.pop('admin_logged_in', None)
    session.pop('user_role', None)
    session.pop('user_id', None)
    session.pop('username', None)
    flash('Logged out successfully.', 'info')
    return redirect(url_for('admin_login'))


# -----------------------------------------------------------------------------
# Signed upload endpoint (the performance centerpiece):
# The browser asks for a signature, then uploads images STRAIGHT to Cloudinary.
# Flask never proxies the image bytes.
# -----------------------------------------------------------------------------
@app.route('/admin/cloudinary-sign')
@admin_required
def admin_cloudinary_sign():
    if not (cloudinary.config().cloud_name and cloudinary.config().api_key and cloudinary.config().api_secret):
        return jsonify({'success': False, 'message': 'Cloudinary is not configured'}), 500
    return jsonify(_signed_upload_params())


# --- Shared product-form parsing helpers (used by add + edit) ---

def _process_product_form_images():
    """Accepts BOTH submission styles and returns:
        (primary_url, size_chart_url, gallery_urls[list], var_urls[list aligned with var_name[]])
    Primary style: tiny hidden URL fields written by product_form_uploads.js after
    direct-to-Cloudinary upload. Fallback style: classic multipart files uploaded
    to Cloudinary from this server in parallel."""
    primary_url = (request.form.get('img_primary_url') or '').strip() or None
    size_chart_url = (request.form.get('size_chart_url') or '').strip() or None
    try:
        gallery_urls = [u for u in (json.loads(request.form.get('gallery_urls') or '[]') or []) if u]
    except (ValueError, TypeError):
        gallery_urls = []
    var_urls = request.form.getlist('var_img_url[]')

    # --- Legacy multipart fallback (only fires for files that were actually chosen) ---
    legacy_tasks = []
    f = request.files.get('img_primary')
    if not primary_url and f and f.filename:
        legacy_tasks.append(('img_primary', f))
    f = request.files.get('size_chart')
    if not size_chart_url and f and f.filename:
        legacy_tasks.append(('size_chart', f))
    gal_files = request.files.getlist('product_images[]')
    if not gallery_urls:
        for i, f in enumerate(gal_files):
            if f and f.filename:
                legacy_tasks.append((f'gallery_{i}', f))
    if not var_urls:
        for i, f in enumerate(request.files.getlist('var_img[]')):
            if f and f.filename:
                legacy_tasks.append((f'var_{i}', f))

    if legacy_tasks:
        uploaded = upload_files_parallel(legacy_tasks)
        primary_url = primary_url or uploaded.get('img_primary')
        size_chart_url = size_chart_url or uploaded.get('size_chart')
        if not gallery_urls:
            gallery_urls = [uploaded[f'gallery_{i}'] for i in range(len(gal_files)) if uploaded.get(f'gallery_{i}')]
        if not var_urls:
            n = len(request.form.getlist('var_name[]'))
            var_urls = [uploaded.get(f'var_{i}') or '' for i in range(n)]

    return primary_url, size_chart_url, gallery_urls, var_urls


def _parse_variation_rows(var_urls, base_price):
    """Parse aligned var_name[]/var_price[]/var_stock[]/var_img_url[] arrays."""
    names = request.form.getlist('var_name[]')
    prices = request.form.getlist('var_price[]')
    stocks = request.form.getlist('var_stock[]')
    rows = []
    for i, raw_name in enumerate(names):
        name = (raw_name or '').strip()
        if not name:
            continue
        try:
            price = float(prices[i]) if i < len(prices) and prices[i] else base_price
        except (ValueError, TypeError):
            price = base_price
        try:
            stock = int(stocks[i]) if i < len(stocks) and stocks[i] else 0
        except (ValueError, TypeError):
            stock = 0
        img = (var_urls[i] or '').strip() if i < len(var_urls) else ''
        rows.append({'name': name, 'price': price, 'stock': stock, 'img_url': img or None})
    return rows


def _sync_variations(product, rows):
    """Diff-based variation sync (the big edit-page win):
      - same name        -> UPDATE in place (variation id and option links survive)
      - name not in form -> DELETE (collect its images for async Cloudinary cleanup)
      - name not in DB   -> INSERT + link attribute values
    Variation name remains the identity key, exactly as before (SKU = "<id>-<name>").
    Returns (trash_urls, total_stock)."""
    trash = []
    existing = ProductVariation.query.filter_by(product_id=product.id).all()
    by_name = {}
    for v in existing:
        name_part = v.sku.split('-', 1)[1] if v.sku and '-' in v.sku else None
        if name_part:
            by_name[name_part] = v

    seen_ids = set()
    new_vars = []
    total_stock = 0

    for r in rows:
        total_stock += r['stock']
        v = by_name.get(r['name'])
        if v is not None:
            seen_ids.add(v.id)
            v.price = r['price']
            v.stock_count = r['stock']
            if r['img_url'] and r['img_url'] != (v.img_primary or ''):
                trash.append(v.img_primary)
                v.img_primary = r['img_url']
        else:
            v = ProductVariation(
                product_id=product.id,
                price=r['price'],
                stock_count=r['stock'],
                sku=f"{product.id}-{r['name']}",
                img_primary=r['img_url']
            )
            db.session.add(v)
            new_vars.append((v, r['name']))

    for v in existing:
        if v.id not in seen_ids:
            trash.append(v.img_primary)
            trash.extend(pi.img_url for pi in v.images)
            db.session.delete(v)

    if new_vars:
        db.session.flush()  # assign ids to new variations only
        attr_value_map = {av.value.lower(): av.id for av in AttributeValue.query.all()}
        for v, name in new_vars:
            parts = [p.strip() for p in name.replace('-', ',').split(',')]
            for p in parts:
                av_id = attr_value_map.get(p.lower())
                if av_id:
                    db.session.add(VariationOption(variation_id=v.id, attribute_value_id=av_id))

    return trash, total_stock


def _sync_product_attributes(product, attr_id_strings):
    """Diff ProductAttribute rows instead of delete-all + re-insert."""
    target = {int(a) for a in attr_id_strings if a}
    current = list(product.product_attributes)
    current_ids = {pa.attribute_id for pa in current}
    for pa in current:
        if pa.attribute_id not in target:
            db.session.delete(pa)
    for aid in target - current_ids:
        db.session.add(ProductAttribute(product_id=product.id, attribute_id=aid))


def _save_wants_profile():
    return REQUEST_TIMING or request.form.get('profile') == '1' or request.args.get('profile') == '1'


# --- PRODUCT FORMS ---

@app.route('/admin/products/add', methods=['GET', 'POST'])
@admin_required
def admin_add_product():
    if request.method == 'POST':
        t = StepTimer('add-product', enabled=_save_wants_profile())
        t.mark('request received')

        product_type = request.form.get('product_type')
        name = request.form.get('name')
        price = float(request.form.get('price') or 0)
        description = request.form.get('description')
        category_id = request.form.get('category_id') or None
        brand_id = request.form.get('brand_id') or None
        stock_count = int(request.form.get('stock_count') or 0)
        t.mark('form parsing & scalars')

        primary_url, size_chart_url, gallery_urls, var_urls = _process_product_form_images()
        t.mark('image transfer (≈0ms when browser uploaded directly)')

        new_product = Product(
            name=name,
            slug=generate_unique_slug(request.form.get('slug') or name),
            price=price,
            img_primary=primary_url,
            description=description,
            category_id=category_id,
            brand_id=brand_id,
            badge=request.form.get('badge'),
            product_type=product_type,
            stock_count=stock_count,
            stock_status=request.form.get('stock_status', 'instock'),
            is_featured='is_featured' in request.form,
            is_trending='is_trending' in request.form,
            is_bestseller='is_bestseller' in request.form,
            size_chart=size_chart_url,
            rating=int(request.form.get('rating') or 5)
        )

        sub_ids = [s for s in request.form.getlist('subcategory_ids') if s]
        if sub_ids:
            new_product.subcategories = SubCategory.query.filter(SubCategory.id.in_(sub_ids)).all()

        db.session.add(new_product)
        db.session.flush()  # get new_product.id once
        t.mark('product row + subcategories')

        for u in gallery_urls:
            db.session.add(ProductImage(product_id=new_product.id, img_url=u))

        for a_id in request.form.getlist('attribute_ids[]'):
            if a_id:
                db.session.add(ProductAttribute(product_id=new_product.id, attribute_id=int(a_id)))
        t.mark('gallery + attributes')

        if product_type == 'variable':
            rows = _parse_variation_rows(var_urls, price)
            _, total_stock = _sync_variations(new_product, rows)
            new_product.stock_count = total_stock
        t.mark('variations')

        db.session.commit()  # ONE commit for the whole save
        t.mark('single commit')
        t.report()

        flash('Product added successfully!', 'success')
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return jsonify({'success': True, 'redirect': url_for('admin_products')})
        return redirect(url_for('admin_products'))

    categories = Category.query.all()
    brands = Brand.query.all()
    attributes = Attribute.query.all()
    return render_template('admin/product_form.html', categories=categories, brands=brands, attributes=attributes, title="Add Product")


@app.route('/admin/products/edit/<int:id>', methods=['GET', 'POST'])
@admin_required
def admin_edit_product(id):
    if request.method == 'POST':
        t = StepTimer(f'edit-product #{id}', enabled=_save_wants_profile())
        t.mark('request received')

        product = Product.query.get_or_404(id)
        trash = []  # Cloudinary URLs to delete AFTER commit, in background

        # --- scalar fields ---
        product.name = request.form.get('name')
        # Slug: skip the uniqueness query loop entirely when it did not change
        slug_field = (request.form.get('slug') or '').strip()
        if slug_field:
            if slugify(slug_field) != (product.slug or ''):
                product.slug = generate_unique_slug(slug_field, product.id)
        elif slugify(product.name or '') != (product.slug or ''):
            product.slug = generate_unique_slug(product.name, product.id)

        product.price = float(request.form.get('price') or 0)
        product.description = request.form.get('description')
        product.category_id = request.form.get('category_id') or None
        product.brand_id = request.form.get('brand_id') or None
        product.badge = request.form.get('badge')
        product.stock_status = request.form.get('stock_status', 'instock')
        product.is_featured = 'is_featured' in request.form
        product.is_trending = 'is_trending' in request.form
        product.is_bestseller = 'is_bestseller' in request.form
        product.rating = int(request.form.get('rating') or 5)
        t.mark('form parsing & scalars')

        # --- images: only URLs (fast) or legacy files (rare fallback) ---
        primary_url, size_chart_url, gallery_urls, var_urls = _process_product_form_images()
        t.mark('image transfer (≈0ms when browser uploaded directly)')

        if primary_url and primary_url != (product.img_primary or ''):
            trash.append(product.img_primary)
            product.img_primary = primary_url
        if size_chart_url and size_chart_url != (product.size_chart or ''):
            trash.append(product.size_chart)
            product.size_chart = size_chart_url
        for u in gallery_urls:
            db.session.add(ProductImage(product_id=product.id, img_url=u))
        t.mark('image bookkeeping')

        # --- attributes: diff instead of delete-all/insert-all ---
        _sync_product_attributes(product, request.form.getlist('attribute_ids[]'))
        t.mark('attributes')

        # --- variations: diff instead of full teardown/rebuild ---
        new_type = request.form.get('product_type', 'simple')
        product.product_type = new_type
        if new_type == 'variable':
            rows = _parse_variation_rows(var_urls, product.price)
            v_trash, total_stock = _sync_variations(product, rows)
            trash.extend(v_trash)
            product.stock_count = total_stock
        else:
            # Switched to 'simple': remove existing variations once.
            for v in ProductVariation.query.filter_by(product_id=product.id).all():
                trash.append(v.img_primary)
                trash.extend(pi.img_url for pi in v.images)
                db.session.delete(v)
            product.stock_count = int(request.form.get('stock_count') or 0)
        t.mark('variations (diff)')

        # --- subcategories: only touch the association when it changed ---
        sub_ids = [s for s in request.form.getlist('subcategory_ids') if s]
        new_subs = SubCategory.query.filter(SubCategory.id.in_(sub_ids)).all() if sub_ids else []
        if {s.id for s in new_subs} != {s.id for s in product.subcategories}:
            product.subcategories = new_subs
        t.mark('subcategories')

        db.session.commit()  # ONE commit for the whole save
        t.mark('single commit')

        # Cloudinary cleanup after commit, off the request thread
        delete_files_async(trash)
        t.mark('queued async Cloudinary cleanup')
        t.report()

        flash('Product updated successfully!', 'success')
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return jsonify({'success': True, 'redirect': url_for('admin_products')})
        return redirect(url_for('admin_products'))

    # GET: eager-load everything the edit template touches (was N+1 lazy loading)
    product = Product.query.options(
        subqueryload(Product.variations).options(
            subqueryload(ProductVariation.options).options(
                joinedload(VariationOption.attribute_value).joinedload(AttributeValue.attribute)
            ),
            subqueryload(ProductVariation.images)
        ),
        subqueryload(Product.images),
        subqueryload(Product.product_attributes).joinedload(ProductAttribute.attribute).subqueryload(Attribute.values),
        subqueryload(Product.subcategories),
    ).filter_by(id=id).first_or_404()

    categories = Category.query.all()
    brands = Brand.query.all()
    attributes = Attribute.query.all()
    return render_template('admin/product_form.html', product=product, categories=categories, brands=brands, attributes=attributes, title="Edit Product")


@app.route('/admin/categories/add', methods=['GET', 'POST'])
@admin_required
def admin_add_category():
    if request.method == 'POST':
        name = request.form.get('name')
        bg = request.form.get('bg')
        img = save_file(request.files.get('img'))

        new_cat = Category(name=name, img=img, bg=bg)
        db.session.add(new_cat)
        db.session.flush()

        subs = request.form.getlist('subcategories_list[]')
        for s in subs:
            if s.strip():
                db.session.add(SubCategory(name=s.strip(), category_id=new_cat.id))
        db.session.commit()
        flash('Category added successfully!', 'success')
        return redirect(url_for('admin_categories'))
    return render_template('admin/category_form.html', title="Add Category")


@app.route('/admin/categories/edit/<int:id>', methods=['GET', 'POST'])
@admin_required
def admin_edit_category(id):
    category = Category.query.get_or_404(id)
    if request.method == 'POST':
        trash = []
        category.name = request.form.get('name')
        category.bg = request.form.get('bg')

        new_img = save_file(request.files.get('img'))
        if new_img:
            if category.img:
                trash.append(category.img)
            category.img = new_img

        SubCategory.query.filter_by(category_id=category.id).delete()
        subs = request.form.getlist('subcategories_list[]')
        for s in subs:
            if s.strip():
                db.session.add(SubCategory(name=s.strip(), category_id=category.id))

        db.session.commit()
        delete_files_async(trash)
        flash('Category updated successfully!', 'success')
        return redirect(url_for('admin_categories'))

    sub_list = [s.name for s in category.subcategories]
    return render_template('admin/category_form.html', category=category, sub_list=sub_list, title="Edit Category")


@app.route('/admin/brands/add', methods=['GET', 'POST'])
@admin_required
def admin_add_brand():
    if request.method == 'POST':
        name = request.form.get('name')
        logo = save_file(request.files.get('logo'))
        new_brand = Brand(name=name, logo=logo)
        db.session.add(new_brand)
        db.session.commit()
        flash('Brand added successfully!', 'success')
        return redirect(url_for('admin_brands'))
    return render_template('admin/brand_form.html', title="Add Brand")


@app.route('/admin/brands/edit/<int:id>', methods=['GET', 'POST'])
@admin_required
def admin_edit_brand(id):
    brand = Brand.query.get_or_404(id)
    if request.method == 'POST':
        trash = []
        brand.name = request.form.get('name')
        new_logo = save_file(request.files.get('logo'))
        if new_logo:
            if brand.logo:
                trash.append(brand.logo)
            brand.logo = new_logo
        db.session.commit()
        delete_files_async(trash)
        flash('Brand updated successfully!', 'success')
        return redirect(url_for('admin_brands'))
    return render_template('admin/brand_form.html', brand=brand, title="Edit Brand")


@app.route('/admin/bulk-stock-update', methods=['POST'])
@admin_required
def admin_bulk_stock_update():
    val_id = request.form.get('attribute_value_id')
    new_stock = int(request.form.get('new_stock') or 0)

    options = VariationOption.query.filter_by(attribute_value_id=val_id).all()
    updated_products = set()

    for opt in options:
        var = ProductVariation.query.get(opt.variation_id)
        if var:
            var.stock_count = new_stock
            updated_products.add(var.product_id)

    for p_id in updated_products:
        product = Product.query.get(p_id)
        if product:
            total = db.session.query(db.func.sum(ProductVariation.stock_count)).filter_by(product_id=p_id).scalar() or 0
            product.stock_count = total

    db.session.commit()
    flash(f'Successfully updated stock for {len(options)} variations across {len(updated_products)} products.', 'success')
    return redirect(url_for('admin_attributes'))


@app.route('/admin/sync-all-stocks')
@admin_required
def admin_sync_all_stocks():
    variations = ProductVariation.query.all()
    VariationOption.query.delete()

    count = 0
    for var in variations:
        if var.sku:
            name_part = var.sku.split('-', 1)[1] if '-' in var.sku else var.sku
            parts = [p.strip() for p in name_part.replace('-', ',').split(',')]
            for p in parts:
                val = AttributeValue.query.filter(AttributeValue.value.ilike(p)).first()
                if val:
                    v_opt = VariationOption(variation_id=var.id, attribute_value_id=val.id)
                    db.session.add(v_opt)
                    count += 1

    products = Product.query.all()
    for p in products:
        total = db.session.query(db.func.sum(ProductVariation.stock_count)).filter_by(product_id=p.id).scalar() or 0
        p.stock_count = total
    db.session.commit()
    flash(f'Successfully resynced {count} variation links across the entire database.', 'success')
    return redirect(url_for('admin_attributes'))


@app.route('/admin/attributes/add', methods=['GET', 'POST'])
@admin_required
def admin_add_attribute():
    if request.method == 'POST':
        name = request.form.get('name')
        type = request.form.get('type', 'select')
        slug = request.form.get('slug')
        if not slug:
            slug = name.lower().replace(' ', '-')

        new_attr = Attribute(name=name, type=type, slug=slug)
        db.session.add(new_attr)
        db.session.flush()

        values_str = request.form.get('values')
        if values_str:
            vals = [v.strip() for v in values_str.split(',') if v.strip()]
            for val in vals:
                new_val = AttributeValue(attribute_id=new_attr.id, value=val)
                db.session.add(new_val)

        db.session.commit()

        if request.headers.get('Accept') == 'application/json':
            vals = [v.value for v in new_attr.values]
            return {'status': 'success', 'id': new_attr.id, 'name': new_attr.name, 'values': vals}
        flash('Attribute added successfully!', 'success')
        return redirect(url_for('admin_attributes'))
    return render_template('admin/attribute_form.html', title="Add Attribute")


@app.route('/admin/attributes/edit/<int:id>', methods=['GET', 'POST'])
@admin_required
def admin_edit_attribute(id):
    attr = Attribute.query.get_or_404(id)
    if request.method == 'POST':
        attr.name = request.form.get('name')
        attr.type = request.form.get('type')

        slug = request.form.get('slug')
        if slug:
            attr.slug = slug
        else:
            attr.slug = attr.name.lower().replace(' ', '-')

        values_str = request.form.get('values')
        if values_str:
            value_ids = [v.id for v in AttributeValue.query.filter_by(attribute_id=attr.id).all()]
            if value_ids:
                VariationOption.query.filter(VariationOption.attribute_value_id.in_(value_ids)).delete(synchronize_session=False)
                AttributeValue.query.filter(AttributeValue.id.in_(value_ids)).delete(synchronize_session=False)
            vals = [v.strip() for v in values_str.split(',') if v.strip()]
            for val in vals:
                new_val = AttributeValue(attribute_id=attr.id, value=val)
                db.session.add(new_val)

        db.session.commit()
        flash('Attribute updated successfully!', 'success')
        return redirect(url_for('admin_attributes'))

    vals_str = ", ".join([v.value for v in attr.values])
    return render_template('admin/attribute_form.html', attribute=attr, vals_str=vals_str, title="Edit Attribute")


# --- REVIEW ROUTES ---

@app.route('/admin/reviews/add', methods=['POST'])
@admin_required
def admin_add_review():
    customer_name = request.form.get('customer_name')
    rating = int(request.form.get('rating') or 5)
    comment = request.form.get('comment')
    product_id = request.form.get('product_id')
    new_review = Review(
        customer_name=customer_name,
        rating=rating,
        comment=comment,
        product_id=product_id if product_id else None
    )
    db.session.add(new_review)
    db.session.commit()
    flash('Review added successfully!', 'success')
    return redirect(url_for('admin_reviews'))


@app.route('/admin/reviews/edit/<int:id>', methods=['POST'])
@admin_required
def admin_edit_review(id):
    review = Review.query.get_or_404(id)
    review.customer_name = request.form.get('customer_name')
    review.rating = int(request.form.get('rating') or 5)
    review.comment = request.form.get('comment')
    db.session.commit()
    flash('Review updated successfully!', 'success')
    return redirect(url_for('admin_reviews'))


@app.route('/admin/reviews/delete/<int:id>')
@admin_required
def admin_delete_review(id):
    review = Review.query.get_or_404(id)
    db.session.delete(review)
    db.session.commit()
    flash('Review deleted!', 'info')
    return redirect(url_for('admin_reviews'))


# --- DELETE ROUTES ---

@app.route('/admin/products/delete/<int:id>')
@admin_required
def admin_delete_product(id):
    product = Product.query.get_or_404(id)

    trash = [product.img_primary, product.img_secondary, product.size_chart]
    trash.extend(img.img_url for img in product.images)
    for var in product.variations:
        trash.append(var.img_primary)
        trash.extend(pi.img_url for pi in var.images)

    variation_ids = [var.id for var in product.variations]
    if variation_ids:
        VariationOption.query.filter(VariationOption.variation_id.in_(variation_ids)).delete(synchronize_session=False)
    Review.query.filter_by(product_id=product.id).delete(synchronize_session=False)
    db.session.execute(product_subcategories.delete().where(product_subcategories.c.product_id == product.id))
    db.session.delete(product)
    db.session.commit()
    delete_files_async(trash)
    flash('Product and all associated images deleted successfully!', 'info')
    return redirect(url_for('admin_products'))


@app.route('/admin/categories/delete/<int:id>')
@admin_required
def admin_delete_category(id):
    category = Category.query.get_or_404(id)
    trash = [category.img]
    db.session.delete(category)
    db.session.commit()
    delete_files_async(trash)
    flash('Category and image deleted successfully!', 'info')
    return redirect(url_for('admin_categories'))


@app.route('/admin/brands/delete/<int:id>')
@admin_required
def admin_delete_brand(id):
    brand = Brand.query.get_or_404(id)
    trash = [brand.logo]
    db.session.delete(brand)
    db.session.commit()
    delete_files_async(trash)
    flash('Brand and logo deleted successfully!', 'info')
    return redirect(url_for('admin_brands'))


@app.route('/admin/product/image/delete/<int:id>')
@admin_required
def admin_delete_gallery_image(id):
    img = ProductImage.query.get_or_404(id)
    p_id = img.product_id
    trash = [img.img_url]
    db.session.delete(img)
    db.session.commit()
    delete_files_async(trash)
    flash('Gallery image removed from cloud!', 'success')
    return redirect(url_for('admin_edit_product', id=p_id))


@app.route('/admin/attributes/delete/<int:id>')
@admin_required
def admin_delete_attribute(id):
    attr = Attribute.query.get_or_404(id)
    value_ids = [v.id for v in attr.values]
    if value_ids:
        VariationOption.query.filter(VariationOption.attribute_value_id.in_(value_ids)).delete(synchronize_session=False)
    db.session.delete(attr)
    db.session.commit()
    flash('Attribute deleted successfully!', 'info')
    return redirect(url_for('admin_attributes'))


@app.route('/admin/categories/add-subcategory', methods=['GET'])
@admin_required
def admin_add_subcategory_page():
    categories = Category.query.all()
    return render_template('admin/subcategory_form.html', categories=categories)


@app.route('/admin/categories/add-subcategory/<int:cat_id>', methods=['POST'])
@admin_required
def admin_add_subcategory(cat_id):
    name = request.form.get('name')
    if name:
        new_sub = SubCategory(name=name, category_id=cat_id)
        db.session.add(new_sub)
        db.session.commit()
        flash('Sub-category added!', 'success')
    return redirect(url_for('admin_categories'))


# --- DATABASE INDEXES (create_all() never alters existing tables, so do it here) ---
def ensure_indexes():
    """Create FK/lookup indexes that the original schema never had. These make
    variation syncs, cascades and product-detail joins dramatically faster."""
    stmts = [
        'CREATE INDEX IF NOT EXISTS ix_product_category ON product(category_id)',
        'CREATE INDEX IF NOT EXISTS ix_product_slug ON product(slug)',
        'CREATE INDEX IF NOT EXISTS ix_product_brand ON product(brand_id)',
        'CREATE INDEX IF NOT EXISTS ix_variation_product ON product_variation(product_id)',
        'CREATE INDEX IF NOT EXISTS ix_var_option_variation ON variation_option(variation_id)',
        'CREATE INDEX IF NOT EXISTS ix_var_option_value ON variation_option(attribute_value_id)',
        'CREATE INDEX IF NOT EXISTS ix_product_image_product ON product_image(product_id)',
        'CREATE INDEX IF NOT EXISTS ix_product_image_variation ON product_image(variation_id)',
        'CREATE INDEX IF NOT EXISTS ix_product_attr_product ON product_attribute(product_id)',
        'CREATE INDEX IF NOT EXISTS ix_attribute_value_attr ON attribute_value(attribute_id)',
        'CREATE INDEX IF NOT EXISTS ix_review_product ON review(product_id)',
        'CREATE INDEX IF NOT EXISTS ix_order_user ON "order"(user_id)',
        'CREATE INDEX IF NOT EXISTS ix_subcategory_category ON sub_category(category_id)',
    ]
    with db.engine.begin() as conn:
        for s in stmts:
            try:
                conn.execute(text(s))
            except Exception as e:
                print(f'index warn: {e}')


# --- DATABASE SEEDING ---

def seed_db():
    with app.app_context():
        try:
            db.session.execute(text("SET statement_timeout = 0"))  # Postgres only; ignored elsewhere
        except Exception:
            db.session.rollback()
        db.create_all()
        ensure_indexes()

        # Seed default admin user if not exists (HASHED password)
        admin_user = User.query.filter_by(username='admin').first()
        if not admin_user:
            admin_user = User(
                username='admin',
                password=generate_password_hash('admin123'),
                role='admin',
                email='admin@luvtale.com',
                phone='9999999999',
                address='Luvtale Head Office, Bangalore, India'
            )
            db.session.add(admin_user)
            db.session.commit()
        elif not str(admin_user.password).startswith(('scrypt:', 'pbkdf2:')):
            # Self-heal: legacy seed stored the admin password as plaintext,
            # which check_password_hash() cannot verify.
            admin_user.password = generate_password_hash(admin_user.password)
            db.session.commit()
            print('Security fix: existing plaintext admin password was migrated to a secure hash.')

        if not Category.query.first():
            cats_data = [
                {"name": "Kurtis", "img": "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400", "bg": "linear-gradient(180deg, #E5D0B1 0%, #7D613E 100%)", "is_new": True},
                {"name": "Sarees", "img": "https://images.unsplash.com/photo-1610030469668-93535c17b6b3?w=400", "bg": "linear-gradient(180deg, #B5CCE1 0%, #4B6B8A 100%)"},
                {"name": "Lehengas", "img": "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=400", "bg": "linear-gradient(180deg, #D1B3E2 0%, #6B4B8A 100%)", "is_hot": True},
                {"name": "Anarkalis", "img": "https://images.unsplash.com/photo-1631857455684-a54a2f03665f?w=400", "bg": "linear-gradient(180deg, #B5E1B5 0%, #4B8A4B 100%)"},
                {"name": "Sherwanis", "img": "https://images.unsplash.com/photo-1605001011156-cbf0b0f67a51?w=400", "bg": "linear-gradient(180deg, #E1D1B5 0%, #8A6B4B 100%)"},
                {"name": "Dupattas", "img": "https://images.unsplash.com/photo-1608748010899-18f300247112?w=400", "bg": "linear-gradient(180deg, #FAD0C4 0%, #D8A5A5 100%)"},
            ]

            for c in cats_data:
                cat = Category(name=c['name'], img=c['img'], bg=c['bg'], is_new=c.get('is_new', False), is_hot=c.get('is_hot', False))
                db.session.add(cat)
            db.session.commit()

            kurtis_cat = Category.query.filter_by(name="Kurtis").first()
            sarees_cat = Category.query.filter_by(name="Sarees").first()
            lehengas_cat = Category.query.filter_by(name="Lehengas").first()
            anarkalis_cat = Category.query.filter_by(name="Anarkalis").first()
            sherwanis_cat = Category.query.filter_by(name="Sherwanis").first()
            dupattas_cat = Category.query.filter_by(name="Dupattas").first()

            products_data = [
                {
                    "name": "Handcrafted Silk Kurti", "price": 89.0, "old_price": 110.0,
                    "category": kurtis_cat, "badge": "20% Off",
                    "img": "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600",
                    "img2": "https://images.unsplash.com/photo-1608748010899-18f300247112?w=600",
                    "is_trending": True, "is_bestseller": False
                },
                {
                    "name": "Royal Bridal Lehenga", "price": 299.0,
                    "category": lehengas_cat, "badge": "Hot",
                    "img": "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600",
                    "img2": "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600",
                    "is_trending": True, "is_bestseller": False
                },
                {
                    "name": "Banarasi Silk Saree", "price": 75.0, "old_price": 95.0,
                    "category": sarees_cat, "badge": "Sale",
                    "img": "https://images.unsplash.com/photo-1610030469668-93535c17b6b3?w=600",
                    "img2": "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600",
                    "is_trending": False, "is_bestseller": True
                },
                {
                    "name": "Embroidered Anarkali Suit", "price": 145.0,
                    "category": anarkalis_cat, "badge": "New",
                    "img": "https://images.unsplash.com/photo-1631857455684-a54a2f03665f?w=600",
                    "img2": "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600",
                    "is_trending": True, "is_bestseller": False
                },
                {
                    "name": "Ethnic Designer Gown", "price": 185.0,
                    "category": lehengas_cat, "badge": "New",
                    "img": "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600",
                    "img2": "https://images.unsplash.com/photo-1631857455684-a54a2f03665f?w=600",
                    "is_trending": False, "is_bestseller": True
                },
                {
                    "name": "Embellished Royal Sherwani", "price": 249.0,
                    "category": sherwanis_cat, "badge": "Sale",
                    "img": "https://images.unsplash.com/photo-1605001011156-cbf0b0f67a51?w=600",
                    "img2": "https://images.unsplash.com/photo-1597983073492-7b4610145cf6?w=600",
                    "is_trending": False, "is_bestseller": True
                },
                {
                    "name": "Premium Zari Dupatta", "price": 45.0,
                    "category": dupattas_cat, "badge": "Premium",
                    "img": "https://images.unsplash.com/photo-1608748010899-18f300247112?w=600",
                    "img2": "https://images.unsplash.com/photo-1610030469668-93535c17b6b3?w=600",
                    "is_trending": True, "is_bestseller": True
                }
            ]

            for p in products_data:
                prod = Product(
                    name=p['name'], price=p['price'], old_price=p.get('old_price'),
                    slug=slugify(p['name']),
                    category_id=p['category'].id, badge=p['badge'],
                    img_primary=p['img'], img_secondary=p['img2'],
                    description=f"Premium {p['name']} designed for style and comfort.",
                    stock_count=50, is_featured=True,
                    is_trending=p.get('is_trending', False),
                    is_bestseller=p.get('is_bestseller', False)
                )
                db.session.add(prod)
            db.session.commit()

            coupons_data = [
                {"code": "LUVTALE10", "discount_type": "Percentage", "discount_value": 10.0, "threshold": 0.0},
                {"code": "FESTIVE25", "discount_type": "Percentage", "discount_value": 25.0, "threshold": 150.0},
                {"code": "WELCOME100", "discount_type": "Flat", "discount_value": 100.0, "threshold": 500.0}
            ]
            for c in coupons_data:
                db.session.add(Coupon(
                    code=c['code'],
                    discount_type=c['discount_type'],
                    discount_value=c['discount_value'],
                    threshold=c['threshold'],
                    is_active=True
                ))
            db.session.commit()

            kurti_prod = Product.query.filter_by(name="Handcrafted Silk Kurti").first()
            lehenga_prod = Product.query.filter_by(name="Royal Bridal Lehenga").first()
            saree_prod = Product.query.filter_by(name="Banarasi Silk Saree").first()
            anarkali_prod = Product.query.filter_by(name="Embroidered Anarkali Suit").first()
            gown_prod = Product.query.filter_by(name="Ethnic Designer Gown").first()
            sherwani_prod = Product.query.filter_by(name="Embellished Royal Sherwani").first()

            product_reviews = [
                {"name": "Anjali S.", "rating": 5, "comment": "Absolutely love the fabric quality! The Banarasi Saree is incredibly elegant and drape is beautiful. Highly recommend Luvtale!", "product": saree_prod},
                {"name": "Meera J.", "rating": 5, "comment": "Beautiful saree, the color is exactly as shown. Perfect for family occasions.", "product": saree_prod},
                {"name": "Rohan M.", "rating": 5, "comment": "The Sherwani fits perfectly for my wedding event. The gold embellishments are detailed and look super luxurious.", "product": sherwani_prod},
                {"name": "Aman V.", "rating": 4, "comment": "Fabric is heavy and feels very premium. Fit was good, minor sleeve alteration needed.", "product": sherwani_prod},
                {"name": "Pooja K.", "rating": 4, "comment": "Great selection of ethnic wear. The Lehenga was custom-fit perfectly and the support team helped me finalize sizes.", "product": lehenga_prod},
                {"name": "Sneha P.", "rating": 5, "comment": "The royal red is stunning. Felt like a queen wearing it!", "product": lehenga_prod},
                {"name": "Deepa R.", "rating": 5, "comment": "Stunning silk work. Feels soft and is lightweight. Exceeded my expectations.", "product": kurti_prod},
                {"name": "Shweta K.", "rating": 5, "comment": "Incredible designer gown! The details are gorgeous and the fabric drape is superb.", "product": gown_prod},
            ]
            for r in product_reviews:
                if r['product']:
                    db.session.add(Review(
                        customer_name=r['name'],
                        rating=r['rating'],
                        comment=r['comment'],
                        product_id=r['product'].id
                    ))
            db.session.commit()

            print("Database seeded with visual demo items!")


@app.route('/api/add-to-cart/<int:id>', methods=['POST'])
def api_add_to_cart(id):
    product = Product.query.get(id)
    if not product:
        return jsonify({'success': False, 'message': 'Product not found'}), 404

    variation_id = request.args.get('v', type=int)
    current_variation = None
    if variation_id:
        current_variation = ProductVariation.query.get(variation_id)

    if 'cart' not in session:
        session['cart'] = {}

    cart = session['cart']
    item_key = f"{id}_{variation_id}" if variation_id else str(id)

    if item_key in cart:
        cart[item_key]['quantity'] += 1
    else:
        name = product.name
        if current_variation:
            var_name = current_variation.sku.split('-', 1)[1] if '-' in current_variation.sku else "Custom"
            name = f"{product.name} ({var_name})"

        cart[item_key] = {
            'id': id,
            'variation_id': variation_id,
            'name': name,
            'price': current_variation.price if current_variation and current_variation.price else product.price,
            'img': current_variation.img_primary if current_variation and current_variation.img_primary else product.img_primary,
            'quantity': 1,
            'slug': product.slug
        }

    session['cart'] = cart
    session.modified = True
    return jsonify({'success': True, 'message': 'Added to cart', 'cart_count': sum(item['quantity'] for item in cart.values())})


@app.route('/api/update-cart/<id>', methods=['POST'])
def api_update_cart(id):
    if 'cart' not in session or id not in session['cart']:
        return jsonify({'success': False}), 404

    delta = request.json.get('delta', 0)
    cart = session['cart']
    cart[id]['quantity'] += delta

    if cart[id]['quantity'] <= 0:
        del cart[id]

    session['cart'] = cart
    session.modified = True
    return jsonify({'success': True, 'cart_count': sum(item['quantity'] for item in cart.values())})


@app.route('/api/remove-from-cart/<id>', methods=['POST'])
def api_remove_from_cart(id):
    if 'cart' in session and id in session['cart']:
        cart = session['cart']
        del cart[id]
        session['cart'] = cart
        session.modified = True
        return jsonify({'success': True, 'cart_count': sum(item['quantity'] for item in cart.values())})
    return jsonify({'success': False}), 404


@app.route('/api/add-to-wishlist/<int:id>', methods=['POST'])
def api_add_to_wishlist(id):
    product = Product.query.get(id)
    if not product:
        return jsonify({'success': False, 'message': 'Product not found'}), 404

    if 'wishlist' not in session:
        session['wishlist'] = []

    wishlist = session['wishlist']
    if id not in wishlist:
        wishlist.append(id)

    session['wishlist'] = wishlist
    session.modified = True
    return jsonify({'success': True, 'message': 'Added to wishlist', 'wishlist_count': len(wishlist)})


@app.route('/api/remove-wishlist/<int:id>', methods=['POST'])
def api_remove_wishlist(id):
    if 'wishlist' in session:
        wishlist = session['wishlist']
        if id in wishlist:
            wishlist.remove(id)
            session['wishlist'] = wishlist
            session.modified = True
            return jsonify({'success': True, 'message': 'Removed from wishlist', 'wishlist_count': len(wishlist)})
    return jsonify({'success': False, 'message': 'Item not found in wishlist'}), 404


@app.route('/api/cart-data')
def api_cart_data():
    cart = session.get('cart', {})
    subtotal = sum(item['price'] * item['quantity'] for item in cart.values())

    applied_coupon = session.get('applied_coupon')
    discount_amount = 0.0
    coupon_code = None

    if applied_coupon and subtotal > 0:
        coupon = Coupon.query.filter_by(code=applied_coupon['code'], is_active=True).first()
        if coupon and (not coupon.expiry_date or coupon.expiry_date >= datetime.utcnow()) and subtotal >= coupon.threshold:
            coupon_code = coupon.code
            if coupon.discount_type == 'Percentage':
                discount_amount = round(subtotal * (coupon.discount_value / 100.0), 2)
            else:
                discount_amount = min(coupon.discount_value, subtotal)
            session['applied_coupon']['discount_amount'] = discount_amount
        else:
            session.pop('applied_coupon', None)
        session.modified = True

    shipping_charge = 0.0
    if subtotal > 0 and subtotal < 500.0:
        shipping_charge = 50.0
    total = max(0.0, subtotal - discount_amount + shipping_charge)

    user_data = None
    if session.get('user_id'):
        user = User.query.get(session['user_id'])
        if user:
            user_data = {
                'email': user.email or '',
                'phone': user.phone or '',
                'address': user.address or ''
            }

    return jsonify({
        'cart': cart,
        'subtotal': subtotal,
        'discount': discount_amount,
        'coupon_code': coupon_code,
        'shipping_charge': shipping_charge,
        'shipping_threshold': 500.0,
        'total': total,
        'count': sum(item['quantity'] for item in cart.values()),
        'user_data': user_data
    })


@app.route('/api/apply-coupon', methods=['POST'])
def api_apply_coupon():
    data = request.get_json() or {}
    code = data.get('code', '').strip().upper()

    if 'cart' not in session or not session['cart']:
        return jsonify({'success': False, 'message': 'Your shopping bag is empty.'}), 400

    coupon = Coupon.query.filter_by(code=code, is_active=True).first()
    if not coupon:
        return jsonify({'success': False, 'message': 'Invalid or inactive coupon code.'}), 404

    if coupon.expiry_date and coupon.expiry_date < datetime.utcnow():
        return jsonify({'success': False, 'message': 'This coupon has expired.'}), 400

    cart = session['cart']
    subtotal = sum(item['price'] * item['quantity'] for item in cart.values())

    if subtotal < coupon.threshold:
        return jsonify({'success': False, 'message': f'Minimum purchase of ₹{coupon.threshold} required for this coupon.'}), 400

    if coupon.discount_type == 'Percentage':
        discount_amount = round(subtotal * (coupon.discount_value / 100.0), 2)
    else:
        discount_amount = min(coupon.discount_value, subtotal)

    session['applied_coupon'] = {
        'code': coupon.code,
        'discount_type': coupon.discount_type,
        'discount_value': coupon.discount_value,
        'discount_amount': discount_amount
    }
    session.modified = True

    return jsonify({
        'success': True,
        'message': f'Coupon "{coupon.code}" applied successfully!',
        'discount_amount': discount_amount,
        'new_total': subtotal - discount_amount
    })


@app.route('/api/remove-coupon', methods=['POST'])
def api_remove_coupon():
    session.pop('applied_coupon', None)
    session.modified = True
    return jsonify({'success': True, 'message': 'Coupon removed successfully.'})


@app.route('/api/place-order', methods=['POST'])
def api_place_order():
    if 'cart' not in session or not session['cart']:
        return jsonify({'success': False, 'message': 'Your shopping bag is empty.'}), 400

    data = request.get_json() or {}
    email = data.get('email')
    phone = data.get('phone')
    address = data.get('address')
    payment_method = data.get('payment_method', 'Card')

    if not email or not phone or not address:
        return jsonify({'success': False, 'message': 'Please provide email, phone number, and delivery address.'}), 400

    cart = session.get('cart', {})
    subtotal = sum(item['price'] * item['quantity'] for item in cart.values())

    applied_coupon = session.get('applied_coupon')
    discount_amount = 0.0
    if applied_coupon:
        coupon = Coupon.query.filter_by(code=applied_coupon['code'], is_active=True).first()
        if coupon and (not coupon.expiry_date or coupon.expiry_date >= datetime.utcnow()) and subtotal >= coupon.threshold:
            if coupon.discount_type == 'Percentage':
                discount_amount = round(subtotal * (coupon.discount_value / 100.0), 2)
            else:
                discount_amount = min(coupon.discount_value, subtotal)

    shipping_charge = 0.0
    if subtotal > 0 and subtotal < 500.0:
        shipping_charge = 50.0
    total_amount = max(0.0, subtotal - discount_amount + shipping_charge)

    order_number = f"LUV-{int(time.time())}-{random.randint(1000, 9999)}"

    status = 'Pending' if payment_method == 'COD' else 'Paid'

    user_id = session.get('user_id')
    new_order = Order(
        order_number=order_number,
        user_id=user_id,
        total_amount=total_amount,
        status=status,
        payment_method=payment_method,
        date=datetime.utcnow()
    )
    db.session.add(new_order)

    for item_key, item in cart.items():
        prod_id = item['id']
        var_id = item.get('variation_id')
        qty = item['quantity']

        product = Product.query.get(prod_id)
        if product:
            product.stock_count = max(0, product.stock_count - qty)
            if var_id:
                variation = ProductVariation.query.get(var_id)
                if variation:
                    variation.stock_count = max(0, variation.stock_count - qty)

    db.session.commit()

    session.pop('cart', None)
    session.pop('applied_coupon', None)
    session.modified = True

    return jsonify({
        'success': True,
        'message': 'Order placed successfully!',
        'order_number': order_number
    })


@app.route('/api/wishlist-data')
def api_wishlist_data():
    wishlist_ids = session.get('wishlist', [])
    products = Product.query.filter(Product.id.in_(wishlist_ids)).all()
    wishlist_data = []
    for p in products:
        wishlist_data.append({
            'id': p.id,
            'name': p.name,
            'slug': p.slug,
            'price': p.price,
            'img': p.img_primary,
            'category_name': p.category.name if p.category else None,
        })
    return jsonify({'wishlist': wishlist_data, 'count': len(wishlist_ids)})


@app.route('/api/user/products')
def api_user_products():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'Authentication required.'}), 401

    products = Product.query.filter_by(user_id=user_id).order_by(Product.id.desc()).all()
    products_data = []
    for p in products:
        products_data.append({
            'id': p.id,
            'name': p.name,
            'slug': p.slug,
            'price': p.price,
            'old_price': p.old_price,
            'img_primary': p.img_primary,
            'description': p.description,
            'category_id': p.category_id,
            'category_name': p.category.name if p.category else 'Uncategorized',
            'stock_count': p.stock_count,
            'is_featured': p.is_featured,
            'is_trending': p.is_trending,
            'is_bestseller': p.is_bestseller,
            'badge': p.badge
        })
    return jsonify({'success': True, 'products': products_data})


@app.route('/api/user/products/add', methods=['POST'])
def api_user_add_product():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'Authentication required.'}), 401

    name = request.form.get('name')
    price_val = request.form.get('price')
    if not name or not price_val:
        return jsonify({'success': False, 'message': 'Name and price are required.'}), 400

    try:
        price = float(price_val)
    except ValueError:
        return jsonify({'success': False, 'message': 'Price must be a number.'}), 400

    old_price_val = request.form.get('old_price')
    old_price = None
    if old_price_val:
        try:
            old_price = float(old_price_val)
        except ValueError:
            pass

    description = request.form.get('description')
    category_id = request.form.get('category_id', type=int)
    stock_count = request.form.get('stock_count', default=10, type=int)
    badge = request.form.get('badge')

    is_featured = request.form.get('is_featured') == 'true' or request.form.get('is_featured') == 'on'
    is_trending = request.form.get('is_trending') == 'true' or request.form.get('is_trending') == 'on'
    is_bestseller = request.form.get('is_bestseller') == 'true' or request.form.get('is_bestseller') == 'on'

    img_primary = None
    file = request.files.get('img_primary')
    if file and file.filename:
        img_primary = save_file(file)
    if not img_primary:
        img_primary = request.form.get('img_url')
    if not img_primary:
        img_primary = 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500'

    new_product = Product(
        name=name,
        slug=generate_unique_slug(name),
        price=price,
        old_price=old_price,
        description=description,
        category_id=category_id,
        stock_count=stock_count,
        badge=badge,
        img_primary=img_primary,
        is_featured=is_featured,
        is_trending=is_trending,
        is_bestseller=is_bestseller,
        user_id=user_id,
        product_type='simple',
        rating=5
    )

    db.session.add(new_product)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Product added successfully!', 'product_id': new_product.id})


@app.route('/api/user/products/edit/<int:id>', methods=['POST'])
def api_user_edit_product(id):
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'Authentication required.'}), 401

    product = Product.query.get_or_404(id)
    if product.user_id != user_id:
        return jsonify({'success': False, 'message': 'Unauthorized to edit this product.'}), 403

    name = request.form.get('name')
    price_val = request.form.get('price')
    if not name or not price_val:
        return jsonify({'success': False, 'message': 'Name and price are required.'}), 400

    try:
        product.price = float(price_val)
    except ValueError:
        return jsonify({'success': False, 'message': 'Price must be a number.'}), 400

    product.name = name
    product.slug = generate_unique_slug(name, product.id)

    old_price_val = request.form.get('old_price')
    if old_price_val:
        try:
            product.old_price = float(old_price_val)
        except ValueError:
            product.old_price = None
    else:
        product.old_price = None

    product.description = request.form.get('description')
    product.category_id = request.form.get('category_id', type=int)
    product.stock_count = request.form.get('stock_count', default=10, type=int)
    product.badge = request.form.get('badge')

    product.is_featured = request.form.get('is_featured') == 'true' or request.form.get('is_featured') == 'on'
    product.is_trending = request.form.get('is_trending') == 'true' or request.form.get('is_trending') == 'on'
    product.is_bestseller = request.form.get('is_bestseller') == 'true' or request.form.get('is_bestseller') == 'on'

    file = request.files.get('img_primary')
    if file and file.filename:
        new_img = save_file(file)
        if new_img:
            product.img_primary = new_img
    else:
        img_url = request.form.get('img_url')
        if img_url:
            product.img_primary = img_url

    db.session.commit()
    return jsonify({'success': True, 'message': 'Product updated successfully!'})


@app.route('/api/user/products/delete/<int:id>', methods=['POST'])
def api_user_delete_product(id):
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'Authentication required.'}), 401

    product = Product.query.get_or_404(id)
    if product.user_id != user_id:
        return jsonify({'success': False, 'message': 'Unauthorized to delete this product.'}), 403

    db.session.delete(product)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Product deleted successfully!'})


@app.route('/api/order/<int:order_id>/return-exchange', methods=['POST'])
def api_user_return_exchange(order_id):
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'Authentication required.'}), 401

    order = Order.query.get_or_404(order_id)
    if order.user_id != user_id:
        return jsonify({'success': False, 'message': 'Unauthorized to modify this order.'}), 403

    data = request.get_json() or {}
    request_type = data.get('request_type')  # 'Return' or 'Exchange'
    reason = data.get('reason')

    if request_type not in ['Return', 'Exchange']:
        return jsonify({'success': False, 'message': 'Invalid request type.'}), 400
    if not reason:
        return jsonify({'success': False, 'message': 'Reason is required.'}), 400

    order.return_exchange_type = request_type
    order.return_exchange_reason = reason
    order.return_exchange_status = 'Pending'
    order.status = f'{request_type} Requested'

    db.session.commit()
    return jsonify({'success': True, 'message': f'{request_type} request submitted successfully.'})


@app.route('/api/admin/orders/<int:order_id>', methods=['GET'])
def api_admin_order_details(order_id):
    if not session.get('admin_logged_in') and session.get('user_role') != 'admin':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    order = Order.query.get_or_404(order_id)
    return jsonify({
        'success': True,
        'order': {
            'id': order.id,
            'order_number': order.order_number,
            'total_amount': order.total_amount,
            'status': order.status,
            'payment_method': order.payment_method,
            'date': order.date.strftime('%Y-%m-%d %H:%M:%S'),
            'username': order.user.username if order.user else 'Guest',
            'email': order.user.email if order.user else 'N/A',
            'phone': order.user.phone if order.user else 'N/A',
            'address': order.user.address if order.user else 'N/A',
            'return_exchange_type': order.return_exchange_type,
            'return_exchange_reason': order.return_exchange_reason,
            'return_exchange_status': order.return_exchange_status
        }
    })


@app.route('/api/admin/orders/edit/<int:order_id>', methods=['POST'])
def api_admin_edit_order(order_id):
    if not session.get('admin_logged_in') and session.get('user_role') != 'admin':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    order = Order.query.get_or_404(order_id)
    data = request.get_json() or {}
    status = data.get('status')
    return_exchange_status = data.get('return_exchange_status')

    if status:
        order.status = status
    if return_exchange_status:
        order.return_exchange_status = return_exchange_status
        if return_exchange_status == 'Approved' and order.return_exchange_type:
            order.status = f'{order.return_exchange_type} Approved'
        elif return_exchange_status == 'Rejected' and order.return_exchange_type:
            order.status = f'{order.return_exchange_type} Rejected'

    db.session.commit()
    return jsonify({'success': True, 'message': 'Order updated successfully!'})


@app.route('/api/admin/customers/<int:customer_id>', methods=['GET'])
def api_admin_customer_details(customer_id):
    if not session.get('admin_logged_in') and session.get('user_role') != 'admin':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    customer = User.query.get_or_404(customer_id)

    return jsonify({
        'success': True,
        'customer': {
            'id': customer.id,
            'username': customer.username,
            'email': customer.email or '',
            'phone': customer.phone or '',
            'address': customer.address or '',
            'orders_count': len(customer.orders_list)
        }
    })


@app.route('/api/admin/customers/edit/<int:customer_id>', methods=['POST'])
def api_admin_edit_customer(customer_id):
    if not session.get('admin_logged_in') and session.get('user_role') != 'admin':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    customer = User.query.get_or_404(customer_id)

    data = request.get_json() or {}
    username = data.get('username')
    email = data.get('email')
    phone = data.get('phone')
    address = data.get('address')

    if not username:
        return jsonify({'success': False, 'message': 'Username is required.'}), 400

    if username != customer.username:
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            return jsonify({'success': False, 'message': 'Username is already taken.'}), 400

    customer.username = username
    customer.email = email
    customer.phone = phone
    customer.address = address

    db.session.commit()
    return jsonify({'success': True, 'message': 'Customer updated successfully!'})


@app.route('/api/admin/customers/delete/<int:customer_id>', methods=['POST'])
def api_admin_delete_customer(customer_id):
    if not session.get('admin_logged_in') and session.get('user_role') != 'admin':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    customer = User.query.get_or_404(customer_id)

    if customer.username == 'admin' or customer.id == session.get('user_id'):
        return jsonify({'success': False, 'message': 'Cannot delete the primary admin account or your own active account.'}), 400

    for product in customer.uploaded_products:
        product.user_id = None
    for order in customer.orders_list:
        order.user_id = None

    db.session.delete(customer)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Customer deleted successfully!'})


@app.route('/api/admin/customers/add', methods=['POST'])
def api_admin_add_customer():
    if not session.get('admin_logged_in') and session.get('user_role') != 'admin':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')
    phone = data.get('phone')
    address = data.get('address')
    role = data.get('role', 'user')

    if not username:
        return jsonify({'success': False, 'message': 'Username is required.'}), 400
    if not password:
        return jsonify({'success': False, 'message': 'Password is required.'}), 400

    existing_user = User.query.filter_by(username=username).first()
    if existing_user:
        return jsonify({'success': False, 'message': 'Username is already taken.'}), 400

    new_customer = User(
        username=username,
        password=generate_password_hash(password),  # FIXED: was stored as plaintext
        role=role,
        email=email,
        phone=phone,
        address=address
    )
    db.session.add(new_customer)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Customer added successfully!'})


if __name__ == '__main__':
    seed_db()
    app.run(debug=os.environ.get('FLASK_DEBUG', '1') == '1',
            host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
    