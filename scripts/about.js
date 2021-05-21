let proofExpanded = false;

const ehProof = document.querySelector(".expand-hide");
const hProof = document.querySelector(".hide");
const proofText = document.querySelector("#proof-text");

ehProof.addEventListener("click", expandOrHide);

function expandOrHide(e) {
    if (proofExpanded) {
        proofText.style.display ="none";
        proofExpanded = false;
        e.target.textContent = "Expand proof";
    } else {
        proofText.style.display ="block";
        proofExpanded = true;
        e.target.textContent = "Hide proof";
    }
}

hProof.addEventListener("click", function() {
    proofText.style.display="none";
    proofExpanded = false;
    ehProof.textContent= "Expand proof";
});
