document.addEventListener('DOMContentLoaded', function() {
    loadAdmins();

    document.getElementById('adminForm').addEventListener('submit', function(event) {
        event.preventDefault();
        
        // Just use direct comparison for simplicity
        const correctPassword = 'GGamer206'; // Keep the original password
        const password = prompt('Enter the admin password:');
        
        if (password !== correctPassword) {
            alert('Incorrect password. You are not authorized to add new admins.');
            return;
        }

        const adminName = document.getElementById('adminName').value;
        const adminRole = document.getElementById('adminRole').value;

        addAdmin(adminName, adminRole);
        saveAdmin(adminName, adminRole);

        document.getElementById('adminForm').reset();
    });
});

function addAdmin(name, role) {
    const memberList = document.querySelector('.MemberList');
    const newMemberCard = document.createElement('div');
    newMemberCard.classList.add('MemberCard');

    const memberName = document.createElement('h3');
    memberName.textContent = name;

    const memberRole = document.createElement('p');
    memberRole.textContent = role;

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.classList.add('delete-button');
    deleteButton.addEventListener('click', function() {
        const correctPassword = 'GGamer206';
        const password = prompt('Enter the admin password:');
        if (password !== correctPassword) {
            alert('Incorrect password. You are not authorized to delete admins.');
            return;
        }
        deleteAdmin(name);
        memberList.removeChild(newMemberCard);
    });

    newMemberCard.appendChild(memberName);
    newMemberCard.appendChild(memberRole);
    newMemberCard.appendChild(deleteButton);
    memberList.appendChild(newMemberCard);
}

function saveAdmin(name, role) {
    let admins = JSON.parse(localStorage.getItem('admins')) || [];
    admins.push({ name, role });
    localStorage.setItem('admins', JSON.stringify(admins));
}

function deleteAdmin(name) {
    let admins = JSON.parse(localStorage.getItem('admins')) || [];
    admins = admins.filter(admin => admin.name !== name);
    localStorage.setItem('admins', JSON.stringify(admins));
}

function loadAdmins() {
    let admins = JSON.parse(localStorage.getItem('admins')) || [];
    admins.forEach(admin => addAdmin(admin.name, admin.role));
}
