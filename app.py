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

    order_id = uuid.uuid4().hex[:10].upper()
    ORDERS[order_id] = {
        'id': order_id,
        'name': name,
        'email': email,
        'phone': phone,
        'address': address,
        'items': items,
        'status': 'Confirmed',
        'created_at': datetime.now(UTC).isoformat()
    }

    # Notify (best-effort, optional)
    try:
        if email:
            send_email(email, f"Order {order_id} Confirmed", f"Thank you {name}! Your order {order_id} is confirmed.")
    except Exception:
        pass
    try:
        if phone:
            send_sms(phone, f"Order {order_id} confirmed. Thank you for shopping with us!")
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
    """AI-powered chatbot API using Gemini for jewelry assistance."""
    data = request.get_json(force=True)
    user_message = (data.get('message') or '').strip().lower()
    
    if not user_message:
        return jsonify({'reply': 'Please ask me something about our jewelry collection!'})
    
    # Try Gemini first
    try:
        import google.generativeai as genai
        
        api_key = os.getenv('GEMINI_API_KEY')
        genai.configure(api_key=api_key)
        
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        system_prompt = f"""You are a helpful AI assistant for "Shri Jewellery", a premium jewelry store in India. You can answer ANY question the user asks - not just about jewelry but about anything! Be friendly, helpful, and conversational. You have the ability to search the internet for current gold and silver rates.

IMPORTANT - GOLD RATES INFO:
- You can search online for the LATEST gold rates in India when user asks about "today's rate", "yesterday's rate", "current rate", or any gold/silver price query
- If user asks about yesterday's gold rate, please search online and provide the accurate rate for that day
- Always try to give the most accurate and current rates available online

STORE INFORMATION:
- Name: Shri Jewellery
- Location: Chinya, Nagamangala Taluk, Mandya District, Mysore Main Road
- Phone: +91 6363650179 / +91 89044 39579
- We specialize in Gold, Silver, and Diamond jewelry for Women, Men, and Children

BASE RATES REFERENCE (Per Gram):
- 24K Gold: approximately ₹12,000-13,000
- 22K Gold: approximately ₹11,000-12,000
- 18K Gold: approximately ₹9,000-10,000
- 925 Sterling Silver: approximately ₹80-100

PRODUCT CATALOG:
- Gold Jewelry: Rings (5g-20g), Chains (10g-35g), Necklaces (10g-30g), Nose pins (1g-3g)
- Silver Jewelry: Rings (5g-10g), Chains (10g-20g), Necklaces (5g-10g), Nose pins (1g-2g)
- Diamond Jewelry: Rings (5g-10g), Necklaces (10g-20g), Nose pins (1g-2g)
- Children's Collection: Gold rings (2g-5g), Silver rings (2g-5g), Gold chains (5g-10g), Silver chains (5g-10g)

SERVICES:
- Online ordering with order tracking
- Delivery across India (3-7 business days)
- Virtual try-on feature available
- 7-day return/exchange policy

User's question: {user_message}
Provide a helpful, friendly response. If user asks about gold/silver rates (today, yesterday, current), search online and provide the latest accurate rates.:"""
        
        response = model.generate_content(system_prompt)
        
        reply = response.text.strip() if response.text else None
        if reply:
            if len(reply) > 800:
                reply = reply[:800] + "...\n\nFor more details, call +91 6363650179."
            return jsonify({'reply': reply})
    except Exception as e:
        error_str = str(e).lower()
        # Filter out specific errors that shouldn't be shown to user
        if 'image' in error_str or 'cannot read' in error_str:
            return jsonify({'reply': 'Sorry, I can only read text messages. Please type your question instead!'})
        print(f"Gemini API error: {e}")
        # Return a friendly error message
        return jsonify({'reply': 'Sorry, I\'m having trouble processing your request right now. Please try asking about gold rates, silver prices, or our products! You can also call us at +91 6363650179.'})
    
    # Fallback: Predefined responses for common jewelry queries
    keywords = {
        'price': 'CURRENT RATES:\n• 24K Gold: ₹12,500/gram\n• 22K Gold: ₹11,500/gram\n• 18K Gold: ₹9,500/gram\n• 925 Silver: ₹90/gram\n\nCall +91 6363650179 for diamond pricing!',
        'gold': 'We offer beautiful gold jewelry including rings, chains, necklaces, and nose pins for women, men, and children. Current 22K Gold rate: ₹11,500/gram. Which item interests you?',
        'silver': 'Our silver collection includes elegant rings, chains, necklaces, and nose pins. Current 925 Silver rate: ₹90/gram. Perfect for both everyday wear and special occasions!',
        'diamond': 'We have premium diamond jewelry including rings, necklaces, and nose pins. Call us for custom designs and current diamond pricing!',
        'ring': 'We offer rings in gold, silver, and diamond for women, men, and children. Available in various designs and weights. What type interests you?',
        'chain': 'Our chains are available in gold, silver, and diamond. 22K Gold chains from ₹35,000, 925 Silver from ₹3,500. What style do you prefer?',
        'necklace': 'Beautiful necklaces in gold, silver, and diamond. 22K Gold necklaces from ₹42,000. We have designs for every occasion!',
        'delivery': 'We deliver across India in 3-7 business days. Free shipping on orders above ₹5,000. Call +91 6363650179 for more details.',
        'return': 'We offer a 7-day return/exchange policy on all jewelry. Contact us at +91 6363650179 to initiate returns.',
        'children': 'We have a special children\'s jewelry collection in gold and silver with safe, age-appropriate designs. Starting from ₹1,500.',
        'about': 'Shri Jewellery is a premium jewelry store in Chinya, Nagamangala Taluk, Mandya District on Mysore Main Road. We specialize in Gold, Silver, and Diamond jewelry for all occasions. Current Gold Rate: 22K @ ₹11,500/gram!',
        'store': 'Shri Jewellery - Your trusted jewelry destination!\n📍 Location: Chinya, Nagamangala Taluk, Mandya District, Mysore Main Road\n📞 Phone: +91 6363650179 / +91 89044 39579\n\nCurrent Gold Rate: 22K @ ₹11,500/gram',
        'contact': '📞 Contact Shri Jewellery:\n• Phone: +91 6363650179\n• Phone: +91 89044 39579\n• Location: Chinya, Nagamangala Taluk, Mandya District, Mysore Main Road\n\nCurrent Gold Rate: 22K @ ₹11,500/gram',
        'rate': 'CURRENT GOLD RATES:\n• 24K Gold: ₹12,500/gram\n• 22K Gold: ₹11,500/gram\n• 18K Gold: ₹9,500/gram\n• 925 Sterling Silver: ₹90/gram\n\nPrices are indicative. Contact +91 6363650179 for exact pricing!',
    }
    
    for keyword, response_text in keywords.items():
        if keyword in user_message:
            return jsonify({'reply': response_text})
    
    # Default fallback if no keywords match
    return jsonify({'reply': 'Thank you for your interest! We specialize in Gold, Silver, and Diamond jewelry for all occasions. What would you like to know? You can ask about prices, designs, delivery, or any of our products. Call us at +91 6363650179 for personalized assistance.'})


if __name__ == '__main__':
    app.run(debug=True)  # reload trigger
