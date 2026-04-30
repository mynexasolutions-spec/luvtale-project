from app import app, db, Review

with app.app_context():
    reviews = [
        Review(customer_name='Sarah M.', rating=5, comment='Absolutely love the quality! The Cozy Knit Cardigan is so soft and the fit is perfect. Will definitely be ordering more.'),
        Review(customer_name='James K.', rating=5, comment='Fast shipping and beautiful packaging. The Athletic Mesh Leggings are exactly as described — super comfortable!'),
        Review(customer_name='Emily R.', rating=4, comment='Great selection and the customer service was incredibly helpful when I needed to exchange sizes. 10/10 would recommend.')
    ]
    db.session.add_all(reviews)
    db.session.commit()
    print("Reviews seeded successfully!")
