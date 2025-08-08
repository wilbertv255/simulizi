const sign_in_btn = document.querySelector("#sign-in-btn");
const sign_up_btn = document.querySelector("#sign-up-btn");
const container = document.querySelector(".container");

// Modal elements
const modal = document.getElementById("messageModal");
const modalMessage = document.getElementById("modal-message");
const closeBtn = document.getElementsByClassName("close-btn")[0];

sign_up_btn.addEventListener("click", () => {
  container.classList.add("sign-up-mode");
});

sign_in_btn.addEventListener("click", () => {
  container.classList.remove("sign-up-mode");
});

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDfYDVYx10P9FUUNTlXw3dfTjPNNlR-Rhc",
  authDomain: "simulizi23.firebaseapp.com",
  databaseURL: "https://simulizi23-default-rtdb.firebaseio.com",
  projectId: "simulizi23",
  storageBucket: "simulizi23.firebasestorage.app",
  messagingSenderId: "306995992624",
  appId: "1:306995992624:web:169d1fa3e2866d771e35f5",
  measurementId: "G-7RLGM76PSE"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

function generateRefNumber() {
  return "REF-" + Math.random().toString(36).substr(2, 6).toUpperCase();
}

// Function to show modal
function showModal(message) {
  modalMessage.textContent = message;
  modal.style.display = "block";
}

// Close modal when the user clicks on <span> (x)
closeBtn.onclick = function () {
  modal.style.display = "none";
};

// Close modal when the user clicks anywhere outside of the modal
window.onclick = function (event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
};

// Format phone number to email
function formatToEmail(phoneNumber) {
  return `${phoneNumber}@gmail.com`;
}

// Sign-up form submission
document.getElementById("sign-up-form").addEventListener("submit", (e) => {
  e.preventDefault();

  const name = document.getElementById("signup-name").value;
  const phoneNumber = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;

  if (!name || !phoneNumber || !password) {
    showModal("Tafadhali jaza sehemu zote!");
    return;
  }

  // Validate phone number (basic check for digits and length)
  if (!/^\d{10}$/.test(phoneNumber)) {
    showModal("Namba ya simu lazima iwe na tarakimu 10!");
    return;
  }

  const email = formatToEmail(phoneNumber);

  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      const refNumber = generateRefNumber();

      set(ref(database, "users/" + user.uid), {
        name: name,
        phoneNumber: phoneNumber, // Store actual phone number
        email: email, // Store formatted email
        premium: 0,
        dateStart: null,
        dateEnd: null,
        referenceNumber: refNumber,
        ended: 0,
      })
        .then(() => {
          showModal("Usajili Umekamilika! Karibu Sana!");
          localStorage.setItem("userID", user.uid);
          window.location.href = "home.html?userId=" + user.uid;
        })
        .catch((error) => {
          showModal("Tatizo la kiufundi limetokea. Jaribu tena!");
        });
    })
    .catch((error) => {
      let errorMessage;
      switch (error.code) {
        case "auth/email-already-in-use":
          errorMessage = "Namba hii tayari imesajiliwa!";
          break;
        case "auth/invalid-email":
          errorMessage = "Namba ya simu sio sahihi!";
          break;
        case "auth/weak-password":
          errorMessage = "Nenosiri ni dhaifu sana! Tumia angalau herufi 6.";
          break;
        default:
          errorMessage = "Kuna tatizo lisilojulikana. Jaribu tena!";
      }
      showModal(errorMessage);
    });
});

// Sign-in form submission
document.getElementById("sign-in-form").addEventListener("submit", (e) => {
  e.preventDefault();

  const phoneNumber = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  if (!phoneNumber || !password) {
    showModal("Tafadhali jaza namba ya simu na nenosiri!");
    return;
  }

  // Validate phone number (basic check for digits and length)
  if (!/^\d{10}$/.test(phoneNumber)) {
    showModal("Namba ya simu lazima iwe na tarakimu 10!");
    return;
  }

  const email = formatToEmail(phoneNumber);

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      const userRef = ref(database, "users/" + user.uid);

      get(userRef)
        .then((snapshot) => {
          if (snapshot.exists()) {
            showModal("Umefanikiwa Kuingia! Karibu Tena!");
            localStorage.setItem("userID", user.uid);
            window.location.href = "home.html?userId=" + user.uid;
          } else {
            showModal("Hakuna mtumiaji anayepatikana na maelezo haya!");
            auth.signOut();
          }
        })
        .catch((error) => {
          showModal("Tatizo la kiufundi limetokea. Jaribu tena!");
        });
    })
    .catch((error) => {
      let errorMessage;
      switch (error.code) {
        case "auth/invalid-credential":
          errorMessage = "Namba ya simu au nenosiri sio sahihi!";
          break;
        case "auth/user-not-found":
          errorMessage = "Hakuna mtumiaji anayepatikana na namba hii!";
          break;
        case "auth/wrong-password":
          errorMessage = "Nenosiri sio sahihi!";
          break;
        case "auth/too-many-requests":
          errorMessage = "Majaribio mengi sana! Subiri kidogo kabla ya kujaribu tena.";
          break;
        default:
          errorMessage = "Kuna tatizo lisilojulikana. Jaribu tena!";
      }
      showModal(errorMessage);
    });
});