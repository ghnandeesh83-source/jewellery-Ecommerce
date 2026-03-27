document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  if (!loginForm) return;

  const phoneStep = document.getElementById('phone-step');
  const otpStep = document.getElementById('otp-step');
  const sendOtpBtn = document.getElementById('send-otp-btn');
  const sendWhatsappBtn = document.getElementById('send-whatsapp-btn');
  const backBtn = document.getElementById('back-btn');
  const phoneInput = document.getElementById('phone');
  const otpInput = document.getElementById('otp');
  const whatsappLinkBtn = document.getElementById('whatsapp-link-btn');

  // Function to handle OTP sending
  async function sendOTP(type) {
    const phone = phoneInput.value;
    if (!phone || !/^[0-9]{10}$/.test(phone)) {
      alert('Please enter a valid 10-digit phone number.');
      return;
    }

    try {
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, type }),
      });

      if (!response.ok) {
        throw new Error('Failed to send OTP.');
      }

      const data = await response.json();
      const sentMsg = document.getElementById('otp-sent-message');
      
      if (type === 'whatsapp') {
        sentMsg.textContent = 'OTP sent via WhatsApp!';
        sentMsg.style.display = 'block';
        // Show WhatsApp link option
        const whatsappLink = document.getElementById('whatsapp-link');
        if (whatsappLink) whatsappLink.style.display = 'block';
        if (whatsappLinkBtn && data.whatsapp_url) {
          whatsappLinkBtn.href = data.whatsapp_url;
        }
      } else {
        sentMsg.textContent = 'OTP sent to your phone!';
        sentMsg.style.display = 'block';
      }
      
      // Move to OTP step after short delay
      setTimeout(() => {
        phoneStep.style.display = 'none';
        otpStep.style.display = 'block';
        otpInput.focus();
      }, 1000);
    } catch (error) {
      alert(error.message);
    }
  }

  // SMS OTP button
  sendOtpBtn.addEventListener('click', () => sendOTP('sms'));

  // WhatsApp OTP button
  sendWhatsappBtn.addEventListener('click', () => sendOTP('whatsapp'));

  // WhatsApp link button
  if (whatsappLinkBtn) {
    whatsappLinkBtn.addEventListener('click', async () => {
      const phone = phoneInput.value;
      if (!phone || !/^[0-9]{10}$/.test(phone)) {
        alert('Please enter a valid 10-digit phone number.');
        return;
      }
      
      try {
        const response = await fetch('/api/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, type: 'whatsapp' }),
        });
        
        const data = await response.json();
        if (data.whatsapp_url) {
          window.open(data.whatsapp_url, '_blank');
        }
        
        // Also show OTP step
        phoneStep.style.display = 'none';
        otpStep.style.display = 'block';
      } catch (error) {
        alert('Failed to generate WhatsApp link');
      }
    });
  }

  backBtn.addEventListener('click', () => {
    phoneStep.style.display = 'block';
    otpStep.style.display = 'none';
    document.getElementById('otp-sent-message').style.display = 'none';
    document.getElementById('whatsapp-link').style.display = 'none';
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = phoneInput.value;
    const otp = otpInput.value;

    try {
      const response = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });

      if (!response.ok) {
        throw new Error('Invalid OTP. Please try again.');
      }

      window.location.href = '/';
    } catch (error) {
      alert(error.message);
    }
  });
});
