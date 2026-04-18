const opsTargets = [
  "localhost",
  "127.0.0.1",
  "192.168.1.156"
];

const opsLinks = document.querySelectorAll("#ops-login-link, #ops-login-link-bottom");
const currentHost = window.location.hostname;
const opsHref = opsTargets.includes(currentHost) ? "/ops/" : "https://ops.naaval.eu";

opsLinks.forEach((link) => {
  link.setAttribute("href", opsHref);
});
