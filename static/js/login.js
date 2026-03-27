document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  if (!loginForm) return;

  const phoneStep = document.getElementById('phone-step');
  const otpStep = document.getElementById('otp-step');
  const sendOtpBtn = document.getElementById('send-otp-btn');
  const sendDemoBtn = document.getElementById('send-demo-btn');
  const backBtn = document.getElementById('back-btn');
  const phoneInput = document.getElementById('phone');
  const otpInput = document.getElementById('otp');
  const whatsappBtn = document.getElementById('whatsapp-btn');

  // WhatsApp OTP - Opens WhatsApp with OTP message
  sendOtpBtn.addEventListener('click', async () => {
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

      if (!response.ok) {
        throw new Error('Failed to send OTP.');
      }

      const data = await response.json();
      
      // Show WhatsApp button
      const whatsappLink = document.getElementById('whatsapp-link');
      if (whatsappLink && data.whatsapp_url) {
        whatsappBtn.href = data.whatsapp_url;
        whatsappLink.style.display = 'block';
      }

      // Move to OTP step
      setTimeout(() => {
        phoneStep.style.display = 'none';
        otpStep.style.display = 'block';
        otpInput.focus();
      }, 500);
    } catch (error) {
      alert(error.message);
    }
  });

  // Demo OTP - Shows OTP on screen
  sendDemoBtn.addEventListener('click', async () => {
    const phone = phoneInput.value;
    if (!phone || !/^[0-9]{10}$/.test(phone)) {
      alert('Please enter a valid 10-digit phone number.');
      return;
    }

    try {
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      if (!response.ok) {
        throw new Error('Failed to send OTP.');
      }

      const data = await response.json();
      
      // Show OTP on screen
      const otpDisplay = document.getElementById('otp-display');
      const otpCode = document.getElementById('otp-code');
      if (otpDisplay && otpCode && data.otp) {
        otpCode.textContent = data.otp;
        otpDisplay.style.display = 'block';
      }

      // Move to OTP step
      setTimeout(() => {
        phoneStep.style.display = 'none';
        otpStep.style.display = 'block';
        otpInput.focus();
      }, 500);
    } catch (error) {
      alert(error.message);
    }
  });

  backBtn.addEventListener('click', () => {
    phoneStep.style.display = 'block';
    otpStep.style.display = 'none';
    const otpDisplay = document.getElementById('otp-display');
    const whatsappLink = document.getElementById('whatsapp-link');
    if (otpDisplay) otpDisplay.style.display = 'none';
    if (whatsappLink) whatsappLink.style.display = 'none';
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
