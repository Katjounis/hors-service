/**
 * Hors Service : envoi des codes de connexion par un Gmail dédié (gratuit, sans domaine).
 * À coller dans un projet Apps Script créé AVEC LE GMAIL DU JEU (script.google.com).
 * 1. Remplacer CLE ci-dessous par la même phrase que le secret GitHub GMAIL_CLE.
 * 2. Déployer > Nouveau déploiement > Application Web : exécuter en tant que « Moi », accès « Tout le monde ».
 * 3. Copier l'URL de l'application Web dans le secret GitHub GMAIL_URL.
 * Limite Gmail gratuit : environ 100 mails par jour.
 */
var CLE = 'A_REMPLACER';

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    if (!d || d.cle !== CLE) return ContentService.createTextOutput('refuse');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.a || '')) return ContentService.createTextOutput('adresse');
    MailApp.sendEmail({ to: d.a, subject: String(d.sujet).slice(0, 200), body: String(d.texte), htmlBody: String(d.html), name: 'Hors Service' });
    return ContentService.createTextOutput('ok');
  } catch (err) {
    return ContentService.createTextOutput('erreur');
  }
}

// À lancer une fois à la main (bouton Exécuter) pour donner l'autorisation d'envoyer des mails.
function autoriser() {
  MailApp.sendEmail(Session.getActiveUser().getEmail(), 'Hors Service : envoi des codes prêt', 'Le script peut envoyer les codes.');
}
