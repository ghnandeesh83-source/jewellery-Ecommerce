document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  if (!loginForm) return; // Exit if not on the login page

  const phoneStep = document.getElementById('phone-step');
  const otpStep = document.getElementById('otp-step');
  const sendOtpBtn = document.getElementById('send-otp-btn');
  const backBtn = document.getElementById('back-btn');
  const phoneInput = document.getElementById('phone');
  const otpInput = document.getElementById('otp');
  const mockOtpDisplay = document.getElementById('mock-otp-display');

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
        body: JSON.stringify({ phone }),
      });

      if (!response.ok) {
        throw new Error('Failed to send OTP.');
      }

      const data = await response.json();
      mockOtpDisplay.textContent = `Mock OTP: ${data.mock_otp}`;
      phoneStep.style.display = 'none';
      otpStep.style.display = 'block';
    } catch (error) {
      alert(error.message);
    }
  });

  backBtn.addEventListener('click', () => {
    phoneStep.style.display = 'block';
    otpStep.style.display = 'none';
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
