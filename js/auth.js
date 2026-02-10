/**
 * الدخول بكلمة مرور ثابتة (يمكن تغييرها هنا لاحقاً أو ربطها بقاعدة بيانات)
 */
const APP_PASSWORD = 'delivery123';
const AUTH_KEY = 'delivery_auth';

function isAuthenticated() {
  return sessionStorage.getItem(AUTH_KEY) === '1';
}

function setAuthenticated() {
  sessionStorage.setItem(AUTH_KEY, '1');
}

function logout() {
  sessionStorage.removeItem(AUTH_KEY);
}

function checkPassword(password) {
  return password === APP_PASSWORD;
}
