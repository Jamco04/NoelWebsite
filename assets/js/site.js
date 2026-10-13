// Shared page behaviour: icons and the mobile menu.
(function () {
  if (window.lucide) window.lucide.createIcons();
  var toggle = document.querySelector(".menu-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }
})();
