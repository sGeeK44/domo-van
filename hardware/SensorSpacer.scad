// --- PARAMÈTRES CAPTEUR (Tes mesures) ---
L_boitier = 63;
W_boitier = 29.5;
H_boitier = 10;
entraxe_yeux = 34;
diam_yeux = 17.5;
entraxe_fix = 72.5;

// --- PARAMÈTRES RÉHAUSSEUR ---
H_rehausse = 45; 
marge = 0.5; // Jeu pour l'encastrement
epaisseur_fond_poche = 3; // Épaisseur sous le capteur

$fn = 80;

module rehausseur_encastre() {
    difference() {
        // 1. CORPS EXTERNE (Bloc principal)
        hull() {
            // Base large pour étanchéité cuve
            translate([0, 0, 2.5])
                cube([entraxe_fix + 20, W_boitier + 15, 5], center=true);
            // Sommet
            translate([0, 0, H_rehausse - 2.5])
                cube([entraxe_fix + 15, W_boitier + 6, 5], center=true);
        }

        // 2. LA POCHE D'ENCASTREMENT (Pour le boitier)
        translate([0, 0, H_rehausse - (H_boitier/2) + 0.1])
            cube([L_boitier + marge, W_boitier + marge, H_boitier + 0.2], center=true);

        // 3. TROUS POUR LES YEUX (Traversent le fond de la poche)
        translate([entraxe_yeux/2, 0, H_rehausse - H_boitier - 5])
            cylinder(h=15, d=diam_yeux + 1);
        translate([-entraxe_yeux/2, 0, H_rehausse - H_boitier - 5])
            cylinder(h=15, d=diam_yeux + 1);

        // 4. ÉVIDEMENT INTERNE ÉVASÉ (Anti-écho)
        hull() {
            translate([0, 0, H_rehausse - H_boitier - 2])
                cube([L_boitier - 5, W_boitier - 5, 1], center=true);
            translate([0, 0, -1])
                cube([L_boitier + 10, W_boitier + 10, 2], center=true);
        }

        // 5. TROUS DE FIXATION CAPTEUR (Pour visser les oreilles)
        translate([0,0, H_rehausse - 1]) {
            translate([entraxe_fix/2, 0, 0])
                cylinder(h=15, d=1.5);
            translate([-entraxe_fix/2, 0, 0])
                cylinder(h=H_rehausse + 1, d=1.5);
        }

        // 6. ENCOCHE POUR LE CÂBLE (Sortie latérale)
        translate([0, W_boitier/2, H_rehausse + 1 - H_boitier/2])
            cube([10, 10, 10], center=true);

        // 7. TROUS FIXATION CUVE (Aux 4 coins)
        for(x=[-1,1], y=[-1,1]) {
            translate([x * (entraxe_fix/2 + 6), y * (W_boitier/2 + 4), -1])
                cylinder(h=20, d=2.5);
        }
    }
}

rehausseur_encastre();