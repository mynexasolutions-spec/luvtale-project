from flask import Flask, render_template, session, redirect, url_for, request, jsonify, flash
from functools import wraps
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
from werkzeug.utils import secure_filename
import os
from datetime import datetime
import cloudinary
import cloudinary.uploader
import cloudinary.api
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'luvtale_secret_key')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Cloudinary Config
cloudinary.config(
  cloud_name = os.environ.get('CLOUDINARY_CLOUD_NAME'),
  api_key = os.environ.get('CLOUDINARY_API_KEY'),
  api_secret = os.environ.get('CLOUDINARY_API_SECRET'),
  secure = True
)

db = SQLAlchemy(app)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_file(file):
    if file and allowed_file(file.filename):
        try:
            upload_result = cloudinary.uploader.upload(file)
            return upload_result['secure_url']
        except Exception as e:
            print(f"Cloudinary upload error: {e}")
            return None
    return None

def delete_file(url):
    if not url or "cloudinary" not in url:
        return
    try:
        # Extract public_id from URL
        # URL usually looks like: https://res.cloudinary.com/cloud_name/image/upload/v12345/public_id.jpg
        public_id = url.split('/')[-1].split('.')[0]
        cloudinary.uploader.destroy(public_id)
    except Exception as e:
        print(f"Cloudinary delete error: {e}")

# --- MODELS (Aligning with Nile/Naye Leithe logic) ---

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), default='user') # 'admin' or 'user'
    email = db.Column(db.String(150))
    phone = db.Column(db.String(20))
    address = db.Column(db.Text)

class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    img = db.Column(db.String(255)) # Image URL instead of emoji
    bg = db.Column(db.String(50)) # Background color/gradient
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
    price = db.Column(db.Float, nullable=False)
    old_price = db.Column(db.Float)
    badge = db.Column(db.String(50))
    img_primary = db.Column(db.String(512))
    img_secondary = db.Column(db.String(512))
    description = db.Column(db.Text)
    category_id = db.Column(db.Integer, db.ForeignKey('category.id'), nullable=True)
    brand_id = db.Column(db.Integer, db.ForeignKey('brand.id'), nullable=True)
    product_type = db.Column(db.String(20), default='simple') # 'simple' or 'variable'
    stock_status = db.Column(db.String(20), default='instock')
    is_featured = db.Column(db.Boolean, default=False)
    is_trending = db.Column(db.Boolean, default=False)
    is_bestseller = db.Column(db.Boolean, default=False)
    rating = db.Column(db.Integer, default=5)
    stock_count = db.Column(db.Integer, default=0)
    size_chart = db.Column(db.String(512)) # New field for size chart image
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)

    user = db.relationship('User', backref=db.backref('uploaded_products', lazy=True))
    
    subcategories = db.relationship('SubCategory', secondary=product_subcategories, backref='products_list', lazy=True)
    variations = db.relationship('ProductVariation', backref='product', lazy=True, cascade="all, delete-orphan")
    product_attributes = db.relationship('ProductAttribute', backref='product', lazy=True, cascade="all, delete-orphan")
    images = db.relationship('ProductImage', backref='product', lazy=True, cascade="all, delete-orphan")

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
    type = db.Column(db.String(50), default='select') # 'select', 'color'
    values = db.relationship('AttributeValue', backref='attribute', lazy=True, cascade="all, delete-orphan")

class AttributeValue(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    attribute_id = db.Column(db.Integer, db.ForeignKey('attribute.id'), nullable=False)
    value = db.Column(db.String(100), nullable=False)

class ProductAttribute(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    attribute_id = db.Column(db.Integer, db.ForeignKey('attribute.id'), nullable=False)

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
    discount_type = db.Column(db.String(20), default='Percentage') # 'Percentage' or 'Flat'
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
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

@app.context_processor
def inject_admin_notifications():
    if not session.get('admin_logged_in'):
        return {'admin_notifications': [], 'notif_count': 0}
    
    notifications = []
    
    # 1. Low Stock Alerts (Products with < 5 stock)
    low_stock = Product.query.filter(Product.stock_count < 5).order_by(Product.stock_count.asc()).limit(3).all()
    for p in low_stock:
        notifications.append({
            'type': 'stock',
            'title': 'Low Stock Alert',
            'message': f'"{p.name}" is running low ({p.stock_count} left)',
            'time': 'Action Required',
            'bg': '#FFF5F5'
        })
    
    # 2. Recent Orders
    recent_orders = Order.query.order_by(Order.date.desc()).limit(2).all()
    for o in recent_orders:
        notifications.append({
            'type': 'order',
            'title': f'New Order #{o.order_number}',
            'message': f'Total amount: ₹{o.total_amount}',
            'time': o.date.strftime('%d %b, %H:%M'),
            'bg': '#FDE2E7'
        })
    
    # 3. Recent Reviews
    recent_reviews = Review.query.order_by(Review.id.desc()).limit(2).all()
    for r in recent_reviews:
        notifications.append({
            'type': 'review',
            'title': 'New Review',
            'message': f'{r.customer_name} left a {r.rating}-star review',
            'time': 'Just now',
            'bg': '#F8F9FB'
        })
        
    return {
        'admin_notifications': notifications[:5], 
        'notif_count': len(notifications)
    }

# --- API ROUTES ---
@app.route('/api/product/<int:id>')
def get_product_api(id):
    product = Product.query.get_or_404(id)
    return jsonify({
        'id': product.id,
        'name': product.name,
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
        'price': p.price,
        'img': p.img_primary
    } for p in products])

# --- USER ROUTES ---

@app.route('/')
def home():
    categories = Category.query.all()
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
    return render_template('index.html', 
                           categories=categories, 
                           trending_products=trending_products, 
                           bestseller_products=bestseller_products, 
                           featured_products=featured_products,
                           reviews=reviews)

@app.route('/shop')
def shop():
    category_ids = request.args.getlist('category', type=int)
    subcategory_ids = request.args.getlist('subcategory', type=int)
    collections = request.args.getlist('collection')
    min_price = request.args.get('min_price', type=float)
    max_price = request.args.get('max_price', type=float)
    sort = request.args.get('sort')
    
    categories = Category.query.all()
    query = Product.query
    
    if category_ids:
        query = query.filter(Product.category_id.in_(category_ids))
    
    if subcategory_ids:
        query = query.join(Product.subcategories).filter(SubCategory.id.in_(subcategory_ids))
        
    if collections:
        collection_filters = []
        if 'trending' in collections:
            collection_filters.append(Product.is_trending == True)
        if 'bestseller' in collections:
            collection_filters.append(Product.is_bestseller == True)
        if 'featured' in collections:
            collection_filters.append(Product.is_featured == True)
        if collection_filters:
            from sqlalchemy import or_
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
    return render_template('shop.html', 
                           categories=categories, 
                           products=products, 
                           category_ids=category_ids, 
                           subcategory_ids=subcategory_ids)

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/contact')
def contact():
    return render_template('contact.html')

@app.route('/privacy-policy')
def privacy_policy():
    return render_template('policy.html', title="Privacy Policy", content="Our Privacy Policy explains how we collect, use, and protect your personal information...")

@app.route('/terms-conditions')
def terms_conditions():
    return render_template('policy.html', title="Terms & Conditions", content="By using our boutique, you agree to our terms of service, which include...")

@app.route('/shipping-policy')
def shipping_policy():
    return render_template('policy.html', title="Shipping Policy", content="We offer worldwide shipping. Orders are processed within 2-3 business days...")

@app.route('/refund-policy')
def refund_policy():
    return render_template('policy.html', title="Cancellation & Refund Policy", content="We offer a 14-day return policy for unused items. Refunds will be processed to the original payment method...")

@app.route('/login', methods=['GET', 'POST'])
def login():
    # If already logged in, show profile details instead of redirecting or showing login form
    if session.get('user_id') or session.get('admin_logged_in'):
        user = None
        if session.get('user_id'):
            user = User.query.get(session['user_id'])
        
        # If admin is logged in but doesn't have a DB record yet, resolve it
        if not user and session.get('admin_logged_in'):
            user = User.query.filter_by(username='admin').first()
            if not user:
                user = User(username='admin', password='admin123', role='admin', email='admin@luvtale.com')
                db.session.add(user)
                db.session.commit()
            session['user_id'] = user.id
            session['user_role'] = 'admin'
            session['username'] = 'admin'
            
        if user:
            orders = Order.query.filter_by(user_id=user.id).order_by(Order.date.desc()).all()
            categories = Category.query.all()
            return render_template('profile.html', user=user, orders=orders, categories=categories)

    # Always pop authentication-related variables on any /login request to ensure a clean slate,
    # while preserving guest cart and wishlist session data.
    session.pop('admin_logged_in', None)
    session.pop('user_role', None)
    session.pop('user_id', None)
    session.pop('username', None)

    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        if username == 'admin' and password == 'admin123':
            user = User.query.filter_by(username='admin').first()
            if not user:
                user = User(username='admin', password='admin123', role='admin', email='admin@luvtale.com')
                db.session.add(user)
                db.session.commit()
            session['admin_logged_in'] = True
            session['user_role'] = 'admin'
            session['username'] = username
            session['user_id'] = user.id
            flash('Admin login successful!', 'success')
            return redirect(url_for('admin_dashboard'))
        user = User.query.filter_by(username=username).first()
        if user and user.password == password:
            session['user_id'] = user.id
            session['username'] = user.username
            session['user_role'] = user.role
            flash('Login successful!', 'success')
            if user.role == 'admin':
                session['admin_logged_in'] = True
                return redirect(url_for('admin_dashboard'))
            else:
                session['admin_logged_in'] = False
            return redirect(url_for('home'))
        else:
            flash('Invalid username or password.', 'error')
    return render_template('auth.html')

@app.route('/signup', methods=['POST'])
def signup():
    username = request.form.get('username')
    password = request.form.get('password')
    confirm_password = request.form.get('confirm_password')
    if password != confirm_password:
        flash('Passwords do not match.', 'error')
        return redirect(url_for('login'))
    if User.query.filter_by(username=username).first():
        flash('Username already exists.', 'error')
        return redirect(url_for('login'))
    new_user = User(username=username, password=password)
    db.session.add(new_user)
    db.session.commit()
    flash('Account created! Please login.', 'success')
    return redirect(url_for('login'))

@app.route('/profile')
def profile():
    if not session.get('user_id'):
        flash('Please login to view your profile.', 'info')
        return redirect(url_for('login'))
    user = User.query.get(session['user_id'])
    # In a real app, we'd have a relationship for orders
    orders = Order.query.filter_by(user_id=user.id).order_by(Order.date.desc()).all()
    categories = Category.query.all()
    return render_template('profile.html', user=user, orders=orders, categories=categories)

@app.route('/update-profile', methods=['POST'])
def update_profile():
    if not session.get('user_id'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    user = User.query.get(session['user_id'])
    user.email = request.form.get('email')
    user.phone = request.form.get('phone')
    user.address = request.form.get('address')
    db.session.commit()
    flash('Profile updated successfully!', 'success')
    return redirect(url_for('profile'))

@app.route('/logout')
def logout():
    session.clear()
    flash('Logged out.', 'info')
    return redirect(url_for('home'))

# --- ADMIN ROUTES ---

@app.route('/admin')
@admin_required
def admin_dashboard():
    # Calculate some fake sales data for the demo as seen in screenshot
    stats = {
        'total_sales': '₹1,24,500',
        'orders_count': Order.query.count(),
        'customers_count': User.query.count(),
        'active_products': Product.query.count()
    }
    recent_orders = Order.query.order_by(Order.date.desc()).limit(5).all()
    # Simplified low stock query
    low_stock_products = Product.query.filter(Product.stock_count < 10).limit(5).all()
    return render_template('admin/dashboard.html', stats=stats, recent_orders=recent_orders, low_stock=low_stock_products)

@app.route('/admin/products')
@admin_required
def admin_products():
    category_ids = request.args.getlist('category', type=int)
    subcategory_ids = request.args.getlist('subcategory', type=int)
    
    query = Product.query
    if category_ids:
        query = query.filter(Product.category_id.in_(category_ids))
    if subcategory_ids:
        query = query.join(Product.subcategories).filter(SubCategory.id.in_(subcategory_ids))
        
    products = query.all()
    categories = Category.query.all()
    subcategories = SubCategory.query.all()
    return render_template('admin/products.html', products=products, categories=categories, subcategories=subcategories, category_ids=category_ids, subcategory_ids=subcategory_ids)

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
    # Calculate total stock for each attribute across all products
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
    flash('Logged out successfully.', 'info')
    return redirect(url_for('login'))

# Forms
@app.route('/admin/products/add', methods=['GET', 'POST'])
@admin_required
def admin_add_product():
    if request.method == 'POST':
        product_type = request.form.get('product_type')
        name = request.form.get('name')
        price = float(request.form.get('price') or 0)
        description = request.form.get('description')
        category_id = request.form.get('category_id')
        stock_count = int(request.form.get('stock_count') or 0)

        img_primary = save_file(request.files.get('img_primary'))

        new_product = Product(
            name=name,
            price=price,
            img_primary=img_primary,
            description=description,
            category_id=category_id,
            brand_id=request.form.get('brand_id'),
            badge=request.form.get('badge'),
            product_type=product_type,
            stock_count=stock_count,
            is_featured='is_featured' in request.form,
            is_trending='is_trending' in request.form,
            is_bestseller='is_bestseller' in request.form,
            size_chart=save_file(request.files.get('size_chart')),
            rating=int(request.form.get('rating') or 5)
        )
        sub_ids = request.form.getlist('subcategory_ids')
        if sub_ids:
            new_product.subcategories = SubCategory.query.filter(SubCategory.id.in_(sub_ids)).all()

        db.session.add(new_product)
        db.session.commit()

        # Handle Secondary Images
        secondary_images = request.files.getlist('product_images[]')
        for img_file in secondary_images:
            if img_file and img_file.filename:
                img_path = save_file(img_file)
                if img_path:
                    db.session.add(ProductImage(product_id=new_product.id, img_url=img_path))
        
        # Handle Product Attributes
        attr_ids = request.form.getlist('attribute_ids[]')
        for a_id in attr_ids:
            if a_id:
                db.session.add(ProductAttribute(product_id=new_product.id, attribute_id=a_id))
        
        db.session.commit()

        if product_type == 'variable':
            var_names = request.form.getlist('var_name[]')
            var_prices = request.form.getlist('var_price[]')
            var_stocks = request.form.getlist('var_stock[]')
            var_imgs = request.files.getlist('var_img[]')
            
            total_stock = 0
            for i in range(len(var_names)):
                if var_names[i]:
                    v_stock = int(var_stocks[i]) if var_stocks[i] else 0
                    total_stock += v_stock
                    
                    v_img_path = None
                    if i < len(var_imgs) and var_imgs[i] and var_imgs[i].filename:
                        v_img_path = save_file(var_imgs[i])
                    
                    variation = ProductVariation(
                        product_id=new_product.id,
                        price=float(var_prices[i]) if var_prices[i] else price,
                        stock_count=v_stock,
                        sku=f"{new_product.id}-{var_names[i]}",
                        img_primary=v_img_path
                    )
                    db.session.add(variation)
                    db.session.flush()

                    # SYNC: Link variation to AttributeValues
                    # Split name like "S - Red" or "XL"
                    parts = [p.strip() for p in var_names[i].replace('-', ',').split(',')]
                    for p in parts:
                        val = AttributeValue.query.filter(AttributeValue.value.ilike(p)).first()
                        if val:
                            v_opt = VariationOption(variation_id=variation.id, attribute_value_id=val.id)
                            db.session.add(v_opt)
            new_product.stock_count = total_stock
            db.session.commit()

        flash('Product added successfully!', 'success')
        return redirect(url_for('admin_products'))
    
    categories = Category.query.all()
    brands = Brand.query.all()
    attributes = Attribute.query.all()
    return render_template('admin/product_form.html', categories=categories, brands=brands, attributes=attributes, title="Add Product")

@app.route('/admin/products/edit/<int:id>', methods=['GET', 'POST'])
@admin_required
def admin_edit_product(id):
    product = Product.query.get_or_404(id)
    if request.method == 'POST':
        product.name = request.form.get('name')
        product.price = float(request.form.get('price') or 0)
        product.description = request.form.get('description')
        product.category_id = request.form.get('category_id')
        product.brand_id = request.form.get('brand_id')
        product.badge = request.form.get('badge')
        product.product_type = request.form.get('product_type')
        product.stock_count = int(request.form.get('stock_count') or 0)
        product.is_featured = 'is_featured' in request.form
        product.is_trending = 'is_trending' in request.form
        product.is_bestseller = 'is_bestseller' in request.form
        product.rating = int(request.form.get('rating') or 5)
        
        new_primary = save_file(request.files.get('img_primary'))
        if new_primary:
            if product.img_primary: delete_file(product.img_primary)
            product.img_primary = new_primary

        new_size_chart = save_file(request.files.get('size_chart'))
        if new_size_chart:
            if product.size_chart: delete_file(product.size_chart)
            product.size_chart = new_size_chart

        # Handle Secondary Images
        secondary_images = request.files.getlist('product_images[]')
        if any(f.filename for f in secondary_images):
            for img_file in secondary_images:
                if img_file and img_file.filename:
                    img_path = save_file(img_file)
                    if img_path:
                        db.session.add(ProductImage(product_id=product.id, img_url=img_path))

        # Handle Product Attributes
        ProductAttribute.query.filter_by(product_id=product.id).delete()
        attr_ids = request.form.getlist('attribute_ids[]')
        for a_id in attr_ids:
            if a_id:
                db.session.add(ProductAttribute(product_id=product.id, attribute_id=a_id))

        if product.product_type == 'variable':
            # Clean up old variation images from Cloudinary
            old_vars = ProductVariation.query.filter_by(product_id=product.id).all()
            for ov in old_vars:
                if ov.img_primary: delete_file(ov.img_primary)
                
            ProductVariation.query.filter_by(product_id=product.id).delete()
            var_names = request.form.getlist('var_name[]')
            var_prices = request.form.getlist('var_price[]')
            var_stocks = request.form.getlist('var_stock[]')
            var_imgs = request.files.getlist('var_img[]')
            
            total_stock = 0
            for i in range(len(var_names)):
                if var_names[i]:
                    v_stock = int(var_stocks[i]) if var_stocks[i] else 0
                    total_stock += v_stock
                    
                    v_img_path = None
                    if i < len(var_imgs) and var_imgs[i] and var_imgs[i].filename:
                        v_img_path = save_file(var_imgs[i])
                    
                    variation = ProductVariation(
                        product_id=product.id,
                        price=float(var_prices[i]) if var_prices[i] else product.price,
                        stock_count=v_stock,
                        sku=f"{product.id}-{var_names[i]}",
                        img_primary=v_img_path
                    )
                    db.session.add(variation)
                    db.session.flush()

                    # SYNC: Link variation to AttributeValues
                    parts = [p.strip() for p in var_names[i].replace('-', ',').split(',')]
                    for p in parts:
                        val = AttributeValue.query.filter(AttributeValue.value.ilike(p)).first()
                        if val:
                            v_opt = VariationOption(variation_id=variation.id, attribute_value_id=val.id)
                            db.session.add(v_opt)
            product.stock_count = total_stock
            db.session.commit()
        
        sub_ids = request.form.getlist('subcategory_ids')
        if sub_ids:
            product.subcategories = SubCategory.query.filter(SubCategory.id.in_(sub_ids)).all()
        else:
            product.subcategories = []

        db.session.commit()
        flash('Product updated successfully!', 'success')
        return redirect(url_for('admin_products'))
    
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
        db.session.commit()
        
        # Sub-categories from dynamic tags
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
        category.name = request.form.get('name')
        category.bg = request.form.get('bg')
        
        new_img = save_file(request.files.get('img'))
        if new_img:
            if category.img: delete_file(category.img)
            category.img = new_img
        
        # Refresh sub-categories
        SubCategory.query.filter_by(category_id=category.id).delete()
        subs = request.form.getlist('subcategories_list[]')
        for s in subs:
            if s.strip():
                db.session.add(SubCategory(name=s.strip(), category_id=category.id))
        
        db.session.commit()
        flash('Category updated successfully!', 'success')
        return redirect(url_for('admin_categories'))
    
    # Pre-fill sub-categories as comma list
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
        brand.name = request.form.get('name')
        new_logo = save_file(request.files.get('logo'))
        if new_logo:
            if brand.logo: delete_file(brand.logo)
            brand.logo = new_logo
        db.session.commit()
        flash('Brand updated successfully!', 'success')
        return redirect(url_for('admin_brands'))
    return render_template('admin/brand_form.html', brand=brand, title="Edit Brand")
@app.route('/admin/bulk-stock-update', methods=['POST'])
@admin_required
def admin_bulk_stock_update():
    val_id = request.form.get('attribute_value_id')
    new_stock = int(request.form.get('new_stock') or 0)
    
    # Find all variations linked to this attribute value
    options = VariationOption.query.filter_by(attribute_value_id=val_id).all()
    updated_products = set()
    
    for opt in options:
        var = ProductVariation.query.get(opt.variation_id)
        if var:
            var.stock_count = new_stock
            updated_products.add(var.product_id)
    
    # Sync main product totals
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
    # Force a full resync of all variation-attribute links
    variations = ProductVariation.query.all()
    # Clear existing options to prevent duplicates
    VariationOption.query.delete()
    
    count = 0
    for var in variations:
        if var.sku:
            # Extract name part from SKU (e.g. "1-S - Red" -> "S - Red")
            name_part = var.sku.split('-', 1)[1] if '-' in var.sku else var.sku
            parts = [p.strip() for p in name_part.replace('-', ',').split(',')]
            for p in parts:
                val = AttributeValue.query.filter(AttributeValue.value.ilike(p)).first()
                if val:
                    v_opt = VariationOption(variation_id=var.id, attribute_value_id=val.id)
                    db.session.add(v_opt)
                    count += 1
    
    # Sync all product totals
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
        db.session.flush() # Get the id

        # Handle values
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
        
        # Handle values
        values_str = request.form.get('values')
        if values_str:
            # Simple sync: delete and re-add
            AttributeValue.query.filter_by(attribute_id=attr.id).delete()
            vals = [v.strip() for v in values_str.split(',') if v.strip()]
            for val in vals:
                new_val = AttributeValue(attribute_id=attr.id, value=val)
                db.session.add(new_val)
        
        db.session.commit()
        flash('Attribute updated successfully!', 'success')
        return redirect(url_for('admin_attributes'))
    
    # Pre-fill values
    vals_str = ", ".join([v.value for v in attr.values])
    return render_template('admin/attribute_form.html', attribute=attr, vals_str=vals_str, title="Edit Attribute")

# --- DELETE ROUTES ---

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

@app.route('/admin/products/delete/<int:id>')
@admin_required
def admin_delete_product(id):
    product = Product.query.get_or_404(id)
    # Clean Cloudinary
    delete_file(product.img_primary)
    delete_file(product.img_secondary)
    delete_file(product.size_chart)
    for img in product.images:
        delete_file(img.img_url)
    for var in product.variations:
        delete_file(var.img_primary)
        
    db.session.delete(product)
    db.session.commit()
    flash('Product and all associated images deleted successfully!', 'info')
    return redirect(url_for('admin_products'))

@app.route('/admin/categories/delete/<int:id>')
@admin_required
def admin_delete_category(id):
    category = Category.query.get_or_404(id)
    delete_file(category.img)
    db.session.delete(category)
    db.session.commit()
    flash('Category and image deleted successfully!', 'info')
    return redirect(url_for('admin_categories'))

@app.route('/admin/brands/delete/<int:id>')
@admin_required
def admin_delete_brand(id):
    brand = Brand.query.get_or_404(id)
    delete_file(brand.logo)
    db.session.delete(brand)
    db.session.commit()
    flash('Brand and logo deleted successfully!', 'info')
    return redirect(url_for('admin_brands'))

@app.route('/admin/product/image/delete/<int:id>')
@admin_required
def admin_delete_gallery_image(id):
    img = ProductImage.query.get_or_404(id)
    p_id = img.product_id
    delete_file(img.img_url)
    db.session.delete(img)
    db.session.commit()
    flash('Gallery image removed from cloud!', 'success')
    return redirect(url_for('admin_edit_product', id=p_id))

@app.route('/admin/attributes/delete/<int:id>')
@admin_required
def admin_delete_attribute(id):
    attr = Attribute.query.get_or_404(id)
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

# --- DATABASE SEEDING ---
def seed_db():
    with app.app_context():
        db.session.execute(text("SET statement_timeout = 0"))
        db.create_all()
        
        # Seed default admin user if not exists
        admin_user = User.query.filter_by(username='admin').first()
        if not admin_user:
            admin_user = User(
                username='admin',
                password='admin123',
                role='admin',
                email='admin@luvtale.com',
                phone='9999999999',
                address='Luvtale Head Office, Bangalore, India'
            )
            db.session.add(admin_user)
            db.session.commit()

        if not Category.query.first():
            # Seed Categories precisely as in image
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
 
            # Get category objects for linking
            kurtis_cat = Category.query.filter_by(name="Kurtis").first()
            sarees_cat = Category.query.filter_by(name="Sarees").first()
            lehengas_cat = Category.query.filter_by(name="Lehengas").first()
            anarkalis_cat = Category.query.filter_by(name="Anarkalis").first()
            sherwanis_cat = Category.query.filter_by(name="Sherwanis").first()
            dupattas_cat = Category.query.filter_by(name="Dupattas").first()
 
            # Seed Products from Image 2 (Indian Ethnic Wear)
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
                    category_id=p['category'].id, badge=p['badge'],
                    img_primary=p['img'], img_secondary=p['img2'],
                    description=f"Premium {p['name']} designed for style and comfort.",
                    stock_count=50, is_featured=True,
                    is_trending=p.get('is_trending', False),
                    is_bestseller=p.get('is_bestseller', False)
                )
                db.session.add(prod)
            db.session.commit()

            # Seed Coupons
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

            # Get products for reviews
            kurti_prod = Product.query.filter_by(name="Handcrafted Silk Kurti").first()
            lehenga_prod = Product.query.filter_by(name="Royal Bridal Lehenga").first()
            saree_prod = Product.query.filter_by(name="Banarasi Silk Saree").first()
            anarkali_prod = Product.query.filter_by(name="Embroidered Anarkali Suit").first()
            gown_prod = Product.query.filter_by(name="Ethnic Designer Gown").first()
            sherwani_prod = Product.query.filter_by(name="Embellished Royal Sherwani").first()
            dupatta_prod = Product.query.filter_by(name="Premium Zari Dupatta").first()

            # Seed specific product reviews
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

@app.route('/product/<int:id>')
def product_detail(id):
    product = Product.query.get_or_404(id)
    variation_id = request.args.get('v', type=int)
    current_variation = None
    
    if variation_id:
        current_variation = ProductVariation.query.get(variation_id)
    elif product.product_type == 'variable' and product.variations:
        current_variation = None
        
    categories = Category.query.all()
    reviews = Review.query.filter_by(product_id=product.id).all()
    return render_template('product_detail.html', product=product, categories=categories, current_variation=current_variation, reviews=reviews)

@app.route('/cart')
def cart_page():
    categories = Category.query.all()
    return render_template('cart.html', categories=categories)

@app.route('/wishlist')
def wishlist_page():
    categories = Category.query.all()
    return render_template('wishlist.html', categories=categories)

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
    # Use a unique key for product + variation
    item_key = f"{id}_{variation_id}" if variation_id else str(id)
    
    if item_key in cart:
        cart[item_key]['quantity'] += 1
    else:
        name = product.name
        if current_variation:
            # Extract variation name from SKU or similar
            var_name = current_variation.sku.split('-', 1)[1] if '-' in current_variation.sku else "Custom"
            name = f"{product.name} ({var_name})"
            
        cart[item_key] = {
            'id': id,
            'variation_id': variation_id,
            'name': name,
            'price': current_variation.price if current_variation and current_variation.price else product.price,
            'img': current_variation.img_primary if current_variation and current_variation.img_primary else product.img_primary,
            'quantity': 1
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
    
    # Recalculate applied coupon if it exists
    applied_coupon = session.get('applied_coupon')
    discount_amount = 0.0
    coupon_code = None
    
    if applied_coupon and subtotal > 0:
        # Re-check from database to ensure it is still valid
        coupon = Coupon.query.filter_by(code=applied_coupon['code'], is_active=True).first()
        if coupon and (not coupon.expiry_date or coupon.expiry_date >= datetime.utcnow()) and subtotal >= coupon.threshold:
            coupon_code = coupon.code
            if coupon.discount_type == 'Percentage':
                discount_amount = round(subtotal * (coupon.discount_value / 100.0), 2)
            else:
                discount_amount = min(coupon.discount_value, subtotal)
            session['applied_coupon']['discount_amount'] = discount_amount
        else:
            # Coupon no longer valid (e.g. cart subtotal fell below threshold)
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
        
    # Check expiry
    if coupon.expiry_date and coupon.expiry_date < datetime.utcnow():
        return jsonify({'success': False, 'message': 'This coupon has expired.'}), 400
        
    # Calculate cart total
    cart = session['cart']
    subtotal = sum(item['price'] * item['quantity'] for item in cart.values())
    
    # Check threshold
    if subtotal < coupon.threshold:
        return jsonify({'success': False, 'message': f'Minimum purchase of ₹{coupon.threshold} required for this coupon.'}), 400
        
    # Calculate discount
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
        
    # Get total amount with discount
    cart = session.get('cart', {})
    subtotal = sum(item['price'] * item['quantity'] for item in cart.values())
    
    # Recalculate applied coupon
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
    
    # Generate unique order number (e.g. LUV-TIMESTAMP-RANDOM)
    import time
    import random
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
    
    # Decrement stock count for products
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
    
    # Clear cart and coupon from session
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
            'price': p.price,
            'img': p.img_primary
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
    request_type = data.get('request_type') # 'Return' or 'Exchange'
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
    
    # Protect main admin account or self-deletion
    if customer.username == 'admin' or customer.id == session.get('user_id'):
        return jsonify({'success': False, 'message': 'Cannot delete the primary admin account or your own active account.'}), 400
        
    # Disassociate uploaded products
    for product in customer.uploaded_products:
        product.user_id = None
    # Disassociate orders
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
        password=password,
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
    app.run(debug=True, port=5000)

