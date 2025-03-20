// screens_bold.js
document.addEventListener('DOMContentLoaded', function() {
    const buttons = document.querySelectorAll('.sidebar button');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            buttons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
        });
    });
});
document.querySelector('.sidebar button:nth-child(1)').style.backgroundColor = '#4CAF50';
const sidebar = document.querySelector('.sidebar');
const buttons = sidebar.querySelectorAll('button');
buttons.forEach(button => {
    button.addEventListener('click', () => {
        buttons.forEach(b => {
            b.style.backgroundColor = '#333';
        });
        button.style.backgroundColor = '#4CAF50';
    });
});