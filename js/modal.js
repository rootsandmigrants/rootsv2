// Get modal elements for immigration modal
const modal = document.getElementById("no-flow-data-modal");
const closeButton = document.querySelector(".close-button-immigration");

// Function to show the modal
function showModal() {
  modal.style.display = "block";

  // Auto-close after 1 second (1000 ms)
  setTimeout(() => {
    modal.style.display = "none";
  }, 3000);
}

// Function to close the modal
function closeModal() {
  modal.style.display = "none";
}

// Close the modal when the close button is clicked
closeButton.addEventListener("click", closeModal);

// Close the modal when clicking outside of it
window.addEventListener("click", (event) => {
  if (event.target === modal) {
    closeModal();
  }
});
