"""
One-off migration: hash any plaintext passwords left over from before password
hashing was introduced, and ensure an admin account exists.

Existing plaintext passwords are hashed in place (users keep logging in with the
same password they already have). Werkzeug hashes always contain a ':' separator
(e.g. "scrypt:32768:8:1$...") which plaintext passwords in this app never did, so
that's used to detect rows that still need migrating.

Run once after deploying the password-hashing change:
    python scripts/migrate_password_hashes.py
"""
import os
import secrets
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from werkzeug.security import generate_password_hash

from app import app, db, User


def looks_hashed(password):
    return password.startswith(("scrypt:", "pbkdf2:"))


def main():
    with app.app_context():
        migrated = 0
        for user in User.query.all():
            if not looks_hashed(user.password):
                user.password = generate_password_hash(user.password)
                migrated += 1
        if migrated:
            db.session.commit()
        print(f"Hashed {migrated} plaintext password(s).")

        admin = User.query.filter_by(role="admin").first()
        if not admin:
            admin_password = os.environ.get("ADMIN_PASSWORD") or secrets.token_urlsafe(12)
            admin = User(
                username="admin",
                password=generate_password_hash(admin_password),
                role="admin",
                email="admin@luvtale.com",
            )
            db.session.add(admin)
            db.session.commit()
            print(f"Created admin user 'admin' with password: {admin_password}")
            print("Store this password securely and change it after first login.")
        else:
            print(f"Admin user already exists: {admin.username}")


if __name__ == "__main__":
    main()
