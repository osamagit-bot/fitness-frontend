import AOS from 'aos';
import 'aos/dist/aos.css';

document.addEventListener("DOMContentLoaded", () => {
  const menuList = document.getElementById("menuList");
  
  if (menuList) {
    menuList.style.maxHeight = "0px";

    window.toggleMenu = function () {
      if (menuList.style.maxHeight === "0px") {
        menuList.style.maxHeight = "300px";
      } else {
        menuList.style.maxHeight = "0px";
      }
    };
  }

  AOS.init();
});
