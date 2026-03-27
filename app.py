import os
import json
import uuid
from datetime import datetime, UTC
from urllib.parse import quote
from flask import Flask, render_template, jsonify, request, redirect, url_for, abort, session
from dotenv import load_dotenv
import random
# Optional email/SMS libs
try:
    from flask_mail import Mail, Message
except Exception:
    Mail = None
    Message = None

try:
    from twilio.rest import Client as TwilioClient
except Exception:
    TwilioClient = None

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "dev-secret")
UNSPLASH_ACCESS_KEY = os.getenv("UNSPLASH_ACCESS_KEY", "")

# Load products once
PRODUCTS_PATH = os.path.join(os.path.dirname(__file__), 'products.json')

# Safely load products JSON without crashing the app
if os.path.exists(PRODUCTS_PATH) and os.path.getsize(PRODUCTS_PATH) > 0:
    try:
        with open(PRODUCTS_PATH, 'r', encoding='utf-8') as f:
            PRODUCTS = json.load(f)
    except json.JSONDecodeError as e:
        # Log the error and fall back to an empty list so the app keeps running
        print(f"Failed to parse products.json: {e}")
        PRODUCTS = []
else:
    # File missing or empty: default to an empty products list
    PRODUCTS = []

# In-memory order store (demo)
ORDERS = {}

# In-memory voucher store
VOUCHERS = {}

# Gift Voucher amounts
VOUCHER_AMOUNTS = [500, 1000, 2000, 5000, 10000]

# Festive themes
VOUCHER_THEMES = {
    'default': {'name': 'Classic', 'color': '#d4af37', 'bg': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'},
    'diwali': {'name': 'Diwali', 'color': '#ff9800', 'bg': 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)'},
    'wedding': {'name': 'Wedding', 'color': '#e91e63', 'bg': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'},
    'birthday': {'name': 'Birthday', 'color': '#9c27b0', 'bg': 'linear-gradient(135deg, #667eea 0%, #f093fb 100%)'},
    'anniversary': {'name': 'Anniversary', 'color': '#c62828', 'bg': 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)'},
}

# Email setup (optional)
mail = None
if Mail:
    app.config.update(
        MAIL_SERVER=os.getenv('MAIL_SERVER'),
        MAIL_PORT=int(os.getenv('MAIL_PORT', '587')),
        MAIL_USE_TLS=os.getenv('MAIL_USE_TLS', 'true').lower() == 'true',
        MAIL_USERNAME=os.getenv('MAIL_USERNAME'),
        MAIL_PASSWORD=os.getenv('MAIL_PASSWORD'),
        MAIL_DEFAULT_SENDER=os.getenv('MAIL_DEFAULT_SENDER')
    )
    try:
        mail = Mail(app)
    except Exception:
        mail = None

# SMS setup (optional)
twilio_client = None
if TwilioClient and os.getenv('TWILIO_ACCOUNT_SID') and os.getenv('TWILIO_AUTH_TOKEN'):
    try:
        twilio_client = TwilioClient(os.getenv('TWILIO_ACCOUNT_SID'), os.getenv('TWILIO_AUTH_TOKEN'))
    except Exception:
        twilio_client = None


def send_email(to_email: str, subject: str, body: str):
    if not mail or not Message:
        return False
    try:
        msg = Message(subject=subject, recipients=[to_email], body=body)
        mail.send(msg)
        return True
    except Exception:
        return False


def send_sms(to_number: str, message: str):
    if not twilio_client or not os.getenv('TWILIO_FROM_NUMBER'):
        return False
    try:
        twilio_client.messages.create(
            body=message,
            from_=os.getenv('TWILIO_FROM_NUMBER'),
            to=to_number
        )
        return True
    except Exception:
        return False


@app.route('/')
def home():
    if not session.get('user'):
        return redirect(url_for('login'))
    return render_template('index.html', products=PRODUCTS, user=session.get('user'))


@app.route('/login')
def login():
    return render_template('login.html')


@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect(url_for('login'))


@app.route('/api/products')
def api_products():
    # Reload products.json on each request so changes on disk appear
    try:
        with open(PRODUCTS_PATH, 'r', encoding='utf-8') as f:
            current = json.load(f)
    except Exception:
        # Fall back to in-memory PRODUCTS if reading fails
        current = PRODUCTS
    return jsonify(current)


@app.route('/api/send-otp', methods=['POST'])
def api_send_otp():
    phone = request.json.get('phone')
    otp_type = request.json.get('type', 'sms')
    
    if not phone or not phone.isdigit() or len(phone) != 10:
        return jsonify({'error': 'Invalid phone number'}), 400

    # Generate OTP
    otp = str(random.randint(100000, 999999))
    session['otp'] = otp
    session['otp_phone'] = phone
    session['otp_created'] = datetime.now().isoformat()

    # For WhatsApp: Generate WhatsApp deep link with pre-filled message
    if otp_type == 'whatsapp':
        message = f"🛍️ *Your Shri Jewellery OTP is: {otp}*\n\nEnter this code to login to your account."
        whatsapp_url = f"https://wa.me/91{phone}?text={quote(message)}"
        print(f"OTP for WhatsApp +91{phone}: {otp}")
        return jsonify({
            'success': True, 
            'message': 'OTP ready on WhatsApp!',
            'whatsapp_url': whatsapp_url,
            'otp': otp  # For demo/testing - remove in production
        })

    # Try to send via Twilio SMS
    try:
        if TwilioClient:
            twilio_sid = os.getenv('TWILIO_ACCOUNT_SID')
            twilio_token = os.getenv('TWILIO_AUTH_TOKEN')
            twilio_from = os.getenv('TWILIO_FROM_NUMBER')
            
            if twilio_sid and twilio_token and twilio_from and twilio_sid != '{{TWILIO_ACCOUNT_SID}}':
                client = TwilioClient(twilio_sid, twilio_token)
                full_phone = f'+91{phone}'
                message = client.messages.create(
                    body=f'Your Shri Jewellery OTP is: {otp}',
                    from_=twilio_from,
                    to=full_phone
                )
                print(f"OTP sent via Twilio to {phone}: {otp}")
                return jsonify({'success': True, 'message': 'OTP sent to your phone!'})
    except Exception as e:
        print(f"Twilio error: {e}")

    # Fallback: Print to console (for testing)
    print(f"OTP for +91{phone}: {otp}")
    return jsonify({'success': True, 'otp': otp})  # Return OTP for demo/testing


@app.route('/api/verify-otp', methods=['POST'])
def api_verify_otp():
    phone = request.json.get('phone')
    otp = request.json.get('otp')

    if not all([phone, otp, session.get('otp'), session.get('otp_phone')]) or \
       phone != session['otp_phone'] or \
       otp != session['otp']:
        return jsonify({'error': 'Invalid OTP'}), 400

    # OTP is correct, log the user in
    session['user'] = {'phone': phone}
    session.pop('otp', None)
    session.pop('otp_phone', None)

    return jsonify({'message': 'Login successful'})


@app.route('/api/order', methods=['POST'])
def api_create_order():
    data = request.get_json(force=True)
    name = data.get('name')
    email = data.get('email')
    phone = data.get('phone')
    address = data.get('address')
    items = data.get('items', [])
    voucher_code = data.get('voucher_code')
    voucher_discount = float(data.get('voucher_discount', 0))

    order_id = uuid.uuid4().hex[:10].upper()
    
    # Calculate total
    subtotal = sum(item.get('price', 0) * item.get('qty', 1) for item in items)
    total = subtotal - voucher_discount
    
    order = {
        'id': order_id,
        'name': name,
        'email': email,
        'phone': phone,
        'address': address,
        'items': items,
        'subtotal': subtotal,
        'voucher_code': voucher_code,
        'voucher_discount': voucher_discount,
        'total': total,
        'status': 'Confirmed',
        'created_at': datetime.now(UTC).isoformat()
    }
    
    # Redeem voucher if applied
    if voucher_code and voucher_discount > 0:
        voucher = VOUCHERS.get(voucher_code.upper())
        if voucher and voucher['balance'] >= voucher_discount:
            voucher['balance'] -= voucher_discount
            voucher['used_amount'] += voucher_discount
            voucher['transactions'].append({
                'type': 'redeem',
                'amount': voucher_discount,
                'order_id': order_id,
                'date': datetime.now(UTC).isoformat()
            })
            if voucher['balance'] <= 0:
                voucher['status'] = 'fully_redeemed'
            order['voucher_applied'] = True
        else:
            order['voucher_applied'] = False
    else:
        order['voucher_applied'] = False
    
    ORDERS[order_id] = order

    # Notify (best-effort, optional)
    try:
        if email:
            discount_msg = f"\nVoucher Discount: -₹{voucher_discount}" if voucher_discount > 0 else ""
            send_email(email, f"Order {order_id} Confirmed", 
                      f"Thank you {name}! Your order {order_id} is confirmed.\n\nSubtotal: ₹{subtotal}{discount_msg}\nTotal: ₹{total}\n\nTrack: {request.host_url}track?order_id={order_id}")
    except Exception:
        pass
    try:
        if phone:
            send_sms(phone, f"Order {order_id} confirmed. Total: ₹{total}. Thank you for shopping with us!")
    except Exception:
        pass

    return jsonify({
        'order_id': order_id,
        'track_url': url_for('track', order_id=order_id)
    }), 201


@app.route('/order/<order_id>')
def order_confirmed(order_id):
    order = ORDERS.get(order_id)
    if not order:
        return redirect(url_for('home'))
    return render_template('order_confirmed.html', order=order)


@app.route('/track')
def track():
    order_id = request.args.get('order_id')
    return render_template('track.html', order_id=order_id)


@app.route('/api/order/<order_id>/status')
def api_order_status(order_id):
    order = ORDERS.get(order_id)
    if not order:
        return jsonify({'error': 'not found'}), 404
    return jsonify({'order_id': order_id, 'status': order['status']})


@app.route('/api/order/<order_id>/mark_delivered', methods=['POST'])
def api_mark_delivered(order_id):
    order = ORDERS.get(order_id)
    if not order:
        return jsonify({'error': 'not found'}), 404
    order['status'] = 'Delivered'
    return jsonify({'ok': True, 'status': order['status']})


@app.route('/api/unsplash')
def api_unsplash():
    """Proxy to Unsplash Search API to fetch one image URL for a query.
    Query params:
      q: search text (e.g., 'gold ring jewelry')
    """
    q = (request.args.get('q') or '').strip()
    if not q:
        return jsonify({'error': 'missing q'}), 400
    
    # Define reliable fallback URLs
    fallback_urls = [
        f'https://via.placeholder.com/500x500/1e2640/aab2c8?text={q.split()[0] if q.split() else "Item"}',
        f'https://picsum.photos/500/500?random={hash(q) % 1000}',
        f'https://source.unsplash.com/500x500/?jewelry,{q.replace(" ", ",")}'
    ]
    
    # If no key, use fallback
    if not UNSPLASH_ACCESS_KEY:
        return jsonify({'url': fallback_urls[2]})
    
    try:
        import requests
        r = requests.get(
            'https://api.unsplash.com/search/photos',
            params={'query': f'{q} jewelry', 'per_page': 3, 'orientation': 'squarish'},
            headers={'Authorization': f'Client-ID {UNSPLASH_ACCESS_KEY}'},
            timeout=5
        )
        if r.status_code != 200:
            return jsonify({'url': fallback_urls[2]})
        
        data = r.json()
        results = data.get('results') or []
        if not results:
            return jsonify({'url': fallback_urls[2]})
        
        # Try to get the best quality URL
        for result in results:
            urls = result.get('urls') or {}
            url = urls.get('small') or urls.get('regular') or urls.get('thumb')
            if url:
                return jsonify({'url': url})
        
        return jsonify({'url': fallback_urls[2]})
    except Exception as e:
        print(f"Unsplash API error: {e}")
        return jsonify({'url': fallback_urls[0]})


@app.route('/try-on')
def try_on():
    return render_template('try_on.html')


# ==================== GIFT VOUCHER SYSTEM ====================

@app.route('/gift-voucher')
def gift_voucher():
    return render_template('gift_voucher.html', amounts=VOUCHER_AMOUNTS, themes=VOUCHER_THEMES)


@app.route('/vouchers')
def vouchers():
    user_phone = session.get('user', {}).get('phone')
    user_vouchers = []
    for code, voucher in VOUCHERS.items():
        if voucher.get('sender_phone') == user_phone or voucher.get('recipient_phone') == user_phone:
            user_vouchers.append({**voucher, 'code': code})
    return render_template('my_vouchers.html', vouchers=user_vouchers)


@app.route('/api/voucher/create', methods=['POST'])
def api_create_voucher():
    data = request.get_json(force=True)
    
    amount = int(data.get('amount', 0))
    if amount not in VOUCHER_AMOUNTS and amount < 100:
        return jsonify({'error': 'Invalid amount'}), 400
    
    sender_name = data.get('sender_name', '').strip()
    recipient_name = data.get('recipient_name', '').strip()
    recipient_phone = data.get('recipient_phone', '').strip()
    recipient_email = data.get('recipient_email', '').strip()
    message = data.get('message', '').strip()
    theme = data.get('theme', 'default')
    delivery_method = data.get('delivery_method', 'inapp')
    delivery_date = data.get('delivery_date', datetime.now().strftime('%Y-%m-%d'))
    
    if not sender_name or not recipient_name:
        return jsonify({'error': 'Name is required'}), 400
    
    # Generate unique voucher code
    voucher_code = f"SJ-{uuid.uuid4().hex[:8].upper()}"
    
    # Set expiry date (1 year from now)
    expiry_date = datetime.now(UTC).replace(year=datetime.now().year + 1)
    
    voucher = {
        'code': voucher_code,
        'amount': amount,
        'balance': amount,
        'sender_name': sender_name,
        'sender_phone': session.get('user', {}).get('phone', ''),
        'recipient_name': recipient_name,
        'recipient_phone': recipient_phone,
        'recipient_email': recipient_email,
        'message': message,
        'theme': theme,
        'delivery_method': delivery_method,
        'delivery_date': delivery_date,
        'status': 'active',
        'used_amount': 0,
        'created_at': datetime.now(UTC).isoformat(),
        'expiry_date': expiry_date.isoformat(),
        'transactions': []
    }
    
    VOUCHERS[voucher_code] = voucher
    
    # Send notification based on delivery method
    if delivery_method == 'sms' and recipient_phone:
        try:
            send_sms(recipient_phone, f"🎁 You received a gift voucher worth ₹{amount} from {sender_name}! Code: {voucher_code}")
        except Exception:
            pass
    
    if delivery_method == 'email' and recipient_email:
        try:
            send_email(recipient_email, "🎁 You received a Gift Voucher!", 
                      f"You received a gift voucher worth ₹{amount} from {sender_name}!\n\nVoucher Code: {voucher_code}\nMessage: {message}")
        except Exception:
            pass
    
    return jsonify({
        'success': True,
        'voucher_code': voucher_code,
        'voucher': voucher
    }), 201


@app.route('/api/voucher/validate', methods=['POST'])
def api_validate_voucher():
    data = request.get_json(force=True)
    code = data.get('code', '').strip().upper()
    
    if not code:
        return jsonify({'error': 'Voucher code required'}), 400
    
    voucher = VOUCHERS.get(code)
    
    if not voucher:
        return jsonify({'error': 'Invalid voucher code', 'valid': False}), 400
    
    # Check if expired
    expiry = datetime.fromisoformat(voucher['expiry_date'].replace('Z', '+00:00'))
    if datetime.now(expiry.tzinfo) > expiry:
        return jsonify({'error': 'Voucher has expired', 'valid': False}), 400
    
    # Check if active
    if voucher['status'] != 'active':
        return jsonify({'error': 'Voucher is no longer active', 'valid': False}), 400
    
    # Check balance
    if voucher['balance'] <= 0:
        return jsonify({'error': 'Voucher balance is empty', 'valid': False}), 400
    
    return jsonify({
        'valid': True,
        'code': code,
        'balance': voucher['balance'],
        'amount': voucher['amount'],
        'recipient_name': voucher['recipient_name'],
        'message': voucher.get('message', '')
    })


@app.route('/api/voucher/redeem', methods=['POST'])
def api_redeem_voucher():
    data = request.get_json(force=True)
    code = data.get('code', '').strip().upper()
    amount_to_redeem = float(data.get('amount', 0))
    order_id = data.get('order_id', '')
    
    if not code or amount_to_redeem <= 0:
        return jsonify({'error': 'Invalid request'}), 400
    
    voucher = VOUCHERS.get(code)
    
    if not voucher:
        return jsonify({'error': 'Invalid voucher code'}), 400
    
    if voucher['balance'] < amount_to_redeem:
        return jsonify({'error': 'Insufficient balance', 'available': voucher['balance']}), 400
    
    # Redeem
    voucher['balance'] -= amount_to_redeem
    voucher['used_amount'] += amount_to_redeem
    voucher['transactions'].append({
        'type': 'redeem',
        'amount': amount_to_redeem,
        'order_id': order_id,
        'date': datetime.now(UTC).isoformat()
    })
    
    # Check if fully used
    if voucher['balance'] <= 0:
        voucher['status'] = 'fully_redeemed'
    
    return jsonify({
        'success': True,
        'redeemed_amount': amount_to_redeem,
        'remaining_balance': voucher['balance'],
        'voucher_code': code
    })


@app.route('/voucher/<code>')
def view_voucher(code):
    code = code.upper()
    voucher = VOUCHERS.get(code)
    if not voucher:
        return render_template('voucher_not_found.html')
    return render_template('view_voucher.html', voucher=voucher, themes=VOUCHER_THEMES)


@app.route('/api/chat', methods=['POST'])
def api_chat():
    """Smart chatbot API with keyword-based responses for jewelry store."""
    data = request.get_json(force=True)
    user_message = (data.get('message') or '').strip().lower()
    
    if not user_message:
        return jsonify({'reply': 'Please ask me something about our jewelry collection!'})
    
    # Advanced keyword responses
    keywords = {
        'price': '💰 CURRENT GOLD RATES:\n• 24K Gold: ₹12,500/gram\n• 22K Gold: ₹11,500/gram\n• 18K Gold: ₹9,500/gram\n• 925 Silver: ₹90/gram\n\nCall +91 6363650179 for diamond pricing!',
        'gold rate': '💰 TODAY\'S GOLD RATES:\n• 24K Gold: ₹12,500/gram\n• 22K Gold: ₹11,500/gram\n• 18K Gold: ₹9,500/gram\n\nGold rates change daily. Call +91 6363650179 for latest rates!',
        'gold': '✨ We offer beautiful gold jewelry!\n• Rings (5g-20g)\n• Chains (10g-35g)\n• Necklaces (10g-30g)\n• Nose Pins (1g-3g)\n\nCurrent 22K Gold: ₹11,500/gram',
        'silver': '🌟 Our silver collection includes:\n• Rings (5g-10g)\n• Chains (10g-20g)\n• Necklaces (5g-10g)\n• Nose Pins (1g-2g)\n\n925 Silver: ₹90/gram',
        'diamond': '💎 Premium diamond jewelry:\n• Rings (5g-10g)\n• Necklaces (10g-20g)\n• Nose Pins (1g-2g)\n\nCall for custom designs & pricing!',
        'ring': '💍 We have beautiful rings for everyone!\n• Gold, Silver & Diamond options\n• Women, Men & Children designs\n• 5g to 20g weights\n\nBrowse our collection!',
        'chain': '⛓️ Our chains collection:\n• Gold chains: ₹35,000 onwards\n• Silver chains: ₹3,500 onwards\n• Diamond chains: ₹1,25,000 onwards\n\nChoose your style!',
        'necklace': '📿 Beautiful necklaces:\n• Gold: ₹42,000 onwards\n• Silver: ₹5,200 onwards\n• Diamond: ₹84,000 onwards\n\nPerfect for every occasion!',
        'nosepin': '👃 Elegant nose pins:\n• Gold: ₹2,500 onwards\n• Silver: ₹240 onwards\n• Diamond: ₹1,960 onwards\n\nDelicate & beautiful designs!',
        'kids': '👧👦 Special kids collection!\n• Safe & age-appropriate\n• Gold & Silver options\n• Starting from ₹1,500\n\nPerfect gifts for little ones!',
        'children': '👧👦 Children\'s jewelry:\n• Gold rings (2g-5g)\n• Silver rings (2g-5g)\n• Gold chains (5g-10g)\n• Starting from ₹1,500',
        'delivery': '🚚 DELIVERY INFO:\n• PAN India delivery\n• 3-7 business days\n• Free shipping above ₹5,000\n• Order tracking available',
        'return': '↩️ RETURN POLICY:\n• 7-day return/exchange\n• Contact +91 6363650179',
        'voucher': '🎁 GIFT VOUCHERS!\n• Amounts: ₹500, ₹1000, ₹2000, ₹5000, ₹10000\n• Themes: Classic, Diwali, Wedding, Birthday\n• Custom messages\n\nVisit /gift-voucher to create!',
        'gift': '🎁 GIFT VOUCHERS!\n• Amounts: ₹500, ₹1000, ₹2000, ₹5000, ₹10000\n• Beautiful themes\n• Share with loved ones!\n\nVisit /gift-voucher!',
        'try on': '📱 VIRTUAL TRY-ON!\n• Try jewelry before buying\n• Camera-based preview\n• Nose pins, Necklaces, Rings\n\nClick "Try On" button in header!',
        'order': '🛒 HOW TO ORDER:\n1. Browse & add to cart\n2. Go to cart\n3. Fill delivery details\n4. Place order\n\nTrack order with order ID!',
        'contact': '📞 CONTACT US:\n• Phone: +91 6363650179\n• Phone: +91 89044 39579\n• Location: Chinya, Nagamangala Taluk, Mandya District\n\nWe\'re here to help!',
        'about': '🏪 SHRI JEWELLERY:\n• Premium jewelry store\n• Gold, Silver & Diamond\n• Located in Chinya, Mandya\n• 15+ years of trust\n\nYour satisfaction is our priority!',
        'store': '🏪 SHRI JEWELLERY:\n• Location: Chinya, Nagamangala Taluk, Mandya District, Mysore Main Road\n• Phone: +91 6363650179\n• Gold, Silver & Diamond jewelry\n\nVisit us today!',
        'location': '📍 SHRI JEWELLERY\nChinya, Nagamangala Taluk,\nMandya District,\nMysore Main Road\n\nVisit us for beautiful jewelry!',
        'help': '❓ I CAN HELP WITH:\n• Product information\n• Gold & silver rates\n• Order tracking\n• Gift vouchers\n• Delivery info\n• Return policy\n\nJust ask me anything!',
        'hours': '🕐 STORE HOURS:\nMonday - Saturday: 10AM - 8PM\nSunday: Closed\n\nCall +91 6363650179 for queries!',
    }
    
    # Check for keywords in message
    for keyword, response_text in keywords.items():
        if keyword in user_message:
            return jsonify({'reply': response_text})
    
    # Default response
    return jsonify({'reply': '👋 Hello! I\'m here to help!\n\nI can assist with:\n• Gold & silver rates\n• Product info\n• Orders & delivery\n• Gift vouchers\n• Store information\n\nWhat would you like to know?\n\nCall: +91 6363650179'})


# ==================== ADMIN PANEL ====================

@app.route('/admin')
def admin():
    """Admin dashboard - requires admin login"""
    return render_template('admin.html', orders=ORDERS, vouchers=VOUCHERS, products=PRODUCTS)


@app.route('/api/admin/login', methods=['POST'])
def api_admin_login():
    """Admin login"""
    data = request.get_json(force=True)
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    
    admin_user = os.getenv('ADMIN_USER', 'admin')
    admin_pass = os.getenv('ADMIN_PASS', 'admin123')
    
    if username == admin_user and password == admin_pass:
        session['admin'] = True
        return jsonify({'success': True})
    
    return jsonify({'error': 'Invalid credentials'}), 401


@app.route('/api/admin/logout')
def api_admin_logout():
    session.pop('admin', None)
    return jsonify({'success': True})


@app.route('/api/admin/orders')
def api_admin_orders():
    """Get all orders"""
    orders_list = [{**order, 'code': code} for code, order in ORDERS.items()]
    orders_list.sort(key=lambda x: x.get('created_at', ''), reverse=True)
    return jsonify(orders_list)


@app.route('/api/admin/order/<order_id>/status', methods=['POST'])
def api_admin_update_order_status(order_id):
    """Update order status"""
    data = request.get_json(force=True)
    new_status = data.get('status', '')
    
    if order_id in ORDERS:
        ORDERS[order_id]['status'] = new_status
        return jsonify({'success': True, 'order': ORDERS[order_id]})
    
    return jsonify({'error': 'Order not found'}), 404


@app.route('/api/admin/vouchers')
def api_admin_vouchers():
    """Get all vouchers"""
    vouchers_list = [{**voucher, 'code': code} for code, voucher in VOUCHERS.items()]
    vouchers_list.sort(key=lambda x: x.get('created_at', ''), reverse=True)
    return jsonify(vouchers_list)


@app.route('/api/admin/voucher/create', methods=['POST'])
def api_admin_create_voucher():
    """Admin creates a voucher"""
    data = request.get_json(force=True)
    
    amount = int(data.get('amount', 0))
    if amount < 100:
        return jsonify({'error': 'Invalid amount'}), 400
    
    sender_name = data.get('sender_name', 'Admin').strip()
    recipient_name = data.get('recipient_name', '').strip()
    recipient_phone = data.get('recipient_phone', '').strip()
    message = data.get('message', 'Gift from Shri Jewellery').strip()
    theme = data.get('theme', 'default')
    
    voucher_code = f"SJ-{uuid.uuid4().hex[:8].upper()}"
    expiry_date = datetime.now(UTC).replace(year=datetime.now().year + 1)
    
    voucher = {
        'code': voucher_code,
        'amount': amount,
        'balance': amount,
        'sender_name': sender_name,
        'sender_phone': 'ADMIN',
        'recipient_name': recipient_name,
        'recipient_phone': recipient_phone,
        'recipient_email': '',
        'message': message,
        'theme': theme,
        'delivery_method': 'inapp',
        'delivery_date': datetime.now().strftime('%Y-%m-%d'),
        'status': 'active',
        'used_amount': 0,
        'created_at': datetime.now(UTC).isoformat(),
        'expiry_date': expiry_date.isoformat(),
        'transactions': []
    }
    
    VOUCHERS[voucher_code] = voucher
    
    return jsonify({'success': True, 'voucher': voucher}), 201


@app.route('/api/admin/voucher/<code>/deactivate', methods=['POST'])
def api_admin_deactivate_voucher(code):
    """Deactivate a voucher"""
    code = code.upper()
    if code in VOUCHERS:
        VOUCHERS[code]['status'] = 'deactivated'
        return jsonify({'success': True})
    return jsonify({'error': 'Voucher not found'}), 404


@app.route('/api/admin/stats')
def api_admin_stats():
    """Get dashboard stats"""
    total_orders = len(ORDERS)
    total_revenue = sum(order.get('total', 0) for order in ORDERS.values())
    total_vouchers = len(VOUCHERS)
    active_vouchers = sum(1 for v in VOUCHERS.values() if v.get('status') == 'active')
    voucher_value = sum(v.get('balance', 0) for v in VOUCHERS.values())
    
    pending_orders = sum(1 for o in ORDERS.values() if o.get('status') == 'Confirmed')
    shipped_orders = sum(1 for o in ORDERS.values() if o.get('status') == 'Shipped')
    delivered_orders = sum(1 for o in ORDERS.values() if o.get('status') == 'Delivered')
    
    return jsonify({
        'total_orders': total_orders,
        'total_revenue': total_revenue,
        'total_vouchers': total_vouchers,
        'active_vouchers': active_vouchers,
        'voucher_value': voucher_value,
        'pending_orders': pending_orders,
        'shipped_orders': shipped_orders,
        'delivered_orders': delivered_orders
    })


if __name__ == '__main__':
    app.run(debug=True)  # reload trigger
