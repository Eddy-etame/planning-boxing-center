Placez ici les fichiers ODS sources (planning rentrée 2026) :

- St Cyprien projet planning Coachs rentrée 2026.ods
- Barrière de Paris projet Coachs planning rentrée 2026 V1.ods
- Ramonville projet planning Coachs rentrée 2026.ods
- Copie de Portet projet planning Coachs rentrée 2026 2.ods
- ETATS UNIS projet planning Coachs rentrée 2026.ods

Regénérer plannings.js depuis la racine du projet :
  python generate_plannings_db.py

Valider :
  python validate_final.py

QUELLE FEUILLE ALIMENTE QUELLE SALLE
------------------------------------
- St Cyprien projet planning Coachs rentrée 2026.ods        -> saint-cyprien
- Barrière de Paris projet Coachs planning rentrée 2026 V1.ods -> minimes
- Ramonville projet planning Coachs rentrée 2026.ods        -> ramonville
- Copie de Portet projet planning Coachs rentrée 2026 2.ods  -> portet-combat (Feuille1)
                                                              + portet-mma (Feuille1_2)
- ETATS UNIS projet planning Coachs rentrée 2026.ods        -> etats-unis-boxe / -mma / -fitness

Sans cette correspondance, rien ne dit que la deuxième feuille du
fichier Portet devient la salle MMA. Ne pas la retirer.
