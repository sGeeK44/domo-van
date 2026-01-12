// --- PARAMÈTRES ---

// Dimensions du composant (relais)
pcb_width = 72;    // Longueur PCB
pcb_depth = 40;    // Largeur PCB
pcb_height = 25;   // Hauteur max composant
pcb_holes_x = 67;  // Entraxe longueur
pcb_holes_y = 34;  // Entraxe largeur

// Paramètres du boitier
wall_thick = 2;    // Epaisseur des murs
clearance = 1.5;   // Espace vide autour du composant
bottom_thick = 2;  // Epaisseur du fond
lid_thick = 4;     // Epaisseur du couvercle

// Paramètres des vis
screw_pcb_diam = 1.8; // Trou pour vis de 2mm
screw_lid_diam = 3;   // Trou pour vis de fermeture (M3)
screw_mod_diam = 4;   // Trou pour insert de fermeture (M3)
wall_mount_screw = 4; // Trou fixation murale

// --- CALCULS ---
inner_x = pcb_width + (clearance * 2);
inner_y = pcb_depth + (clearance * 2);
inner_z = pcb_height + 2; 

outer_x = inner_x + (wall_thick * 2);
outer_y = inner_y + (wall_thick * 2);
outer_z = inner_z + bottom_thick;

// Position des colonnes (coins extérieurs)
col_offset_x = (inner_x / 2) + 1; 
col_offset_y = (inner_y / 2) + 1;
col_diam = 8; // Diamètre des piliers

$fn = 60; 

// --- RENDU ---
// Boitier
translate([0, 0, outer_z/2]) 
    case();

// Couvercle (à côté)
translate([0, outer_y + 15, lid_thick/2])
    rotate([180, 0, 0])
    lid();


// --- MODULES ---

module case() {
    difference() {
        union() {
            // 1. Boite de base
            cube([outer_x, outer_y, outer_z], center=true);
            
            // 2. Colonnes aux 4 coins (Ajoutées à l'extérieur pour ne pas toucher le PCB)
            for(x = [-1, 1]) for(y = [-1, 1]) {
                translate([x * col_offset_x, y * col_offset_y, 0])
                cylinder(h=outer_z, d=col_diam, center=true);
            }

            // 3. Oreilles de fixation (Allongées)
            ear_pos_x = (outer_x/2);
            ear_z = -outer_z/2 + bottom_thick/2;
            
            for(dir = [-1, 1]) {
                translate([dir * ear_pos_x, 0, ear_z])
                hull() {
                    // Base contre le boitier
                    translate([0, -10, 0]) cylinder(h=bottom_thick, d=10, center=true);
                    translate([0, 10, 0]) cylinder(h=bottom_thick, d=10, center=true);
                    // Extrémité allongée (12mm)
                    translate([dir * 12, 0, 0]) cylinder(h=bottom_thick, d=10, center=true);
                }
            }
        }

        // --- SOUSTRACTIONS ---

        // 1. Vide intérieur (Rectangle simple)
        translate([0, 0, wall_thick])
        cube([inner_x -2, inner_y -2, inner_z + 5], center=true);
        
        // 2. Trous insert vis du couvercle
        hole_depth = 20;
        hole_z = (outer_z/2) - (hole_depth/2) + 0.1;
        for(x = [-1, 1]) for(y = [-1, 1]) {
            translate([x * col_offset_x, y * col_offset_y, hole_z])
            cylinder(h=hole_depth, d=screw_mod_diam - 0.5, center=true);
        }
        
        // 3. Passage de câbles (Abaissés)
        // PCB posé à environ Z = -10 (relatif au centre). Terminals à Z ~ -5.
        
        translate([-(outer_x/2), 0, -3]) // Gauche (command)
        rotate([0, 90, 0])
        hull() {
            translate([0, -5, 0]) cylinder(h=20, d=10, center=true);
            translate([0, 5, 0]) cylinder(h=20, d=10, center=true); // Oblong vertical pour flexibilité
        }
        
        translate([(outer_x/2), 0, 0]) // Droite (puissance)
        rotate([0, 90, 0])
        hull() {
            translate([0, -5, 0]) cylinder(h=20, d=10, center=true);
            translate([0, 5, 0]) cylinder(h=20, d=10, center=true);
        }
        
        // 4. Trous des oreilles de fixation
        for(dir = [-1, 1]) {
             // Positionné à 12mm du bord pour être centré dans l'arrondi
             translate([dir * (outer_x/2 + 12), 0, -outer_z/2])
             cylinder(h=20, d=wall_mount_screw, center=true);
        }
    }

    // Supports PCB (Standoffs)
    translate([0, 0, -outer_z/2 + bottom_thick])
    difference() {
        union() {
            for(x = [-1, 1]) for(y = [-1, 1]) {
                translate([x * (pcb_holes_x/2), y * (pcb_holes_y/2), 2])
                cylinder(h=4, d=6, center=true);
            }
        }
        // Trous vis PCB
        for(x = [-1, 1]) for(y = [-1, 1]) {
            translate([x * (pcb_holes_x/2), y * (pcb_holes_y/2), 3])
            cylinder(h=10, d=screw_pcb_diam, center=true);
        }
    }
}

module lid() {
    difference() {
        union() {
            // Plaque principale qui couvre tout (boite + colonnes)
            hull() {
                cube([outer_x, outer_y, lid_thick], center=true);
                for(x = [-1, 1]) for(y = [-1, 1]) {
                    translate([x * col_offset_x, y * col_offset_y, 0])
                    cylinder(h=lid_thick, d=col_diam, center=true);
                }
            }
            
            // Lèvre intérieure (Carrée simple pour rentrer dans le trou)
            translate([0, 0, -lid_thick])
            difference() {
                cube([inner_x - 2 - 0.4, inner_y - 2 - 0.4, lid_thick], center=true);
                cube([inner_x - 6, inner_y - 6, lid_thick + 1], center=true);
            }
        }
        
        // Trous de vis
        for(x = [-1, 1]) for(y = [-1, 1]) {
            translate([x * col_offset_x, y * col_offset_y, 0]) {
                cylinder(h=10, d=screw_lid_diam + 0.5, center=true); 
                translate([0, 0, 1.5]) cylinder(h=3, d=6, center=true); // Tête noyée
            }
        }
        
        // Aération
        for(i = [-5 : 5]) {
            translate([i * 4, 0, 0])
            cube([2, 20, 10], center=true);
        }
    }
}