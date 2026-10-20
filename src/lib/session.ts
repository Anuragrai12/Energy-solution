let userEmail = '';
let userPassword = '';

export function setCredentials(email: string, password: string) {
  userEmail = email;
  userPassword = password;
}

export function clearCredentials() {
  userEmail = '';
  userPassword = '';
}

export function getCredentials() {
  return { email: userEmail, password: userPassword };
}
