// --- PARAMÈTRES RÉELS DU CAPTEUR ---
pcb_w = 15.5;      
pcb_l = 13.0;      
pcb_h = 2.0;       
wall = 1.6;        
h_interne = 10.0;  // Assez haut pour les soudures/headers
cable_w = 5.0;     
cable_h = 4.0;     

$fn = 50;

// --- VUE D'ENSEMBLE ---
translate([0, 0, 0]) boitier_base();

// Couvercle retourné pour l'impression
translate([0, pcb_l + 30, wall]) 
    rotate([180, 0, 0]) 
    boitier_couvercle();

// --- MODULE BASE ---
module boitier_base() {
    union() {
        difference() {
            // Corps extérieur
            cube([pcb_w + 2*wall, pcb_l + 2*wall, h_interne + wall]);
            
            // Volume intérieur
            translate([wall, wall, wall])
                cube([pcb_w, pcb_l, h_interne + 2]);
                
            // Sortie de câble
            translate([pcb_w/2 + wall - cable_w/2, -1, wall + 2])
                cube([cable_w, wall + 2, cable_h]);

            // ENCOCHES ABAISSÉES (pour bras plus longs et souples)
            // On descend l'encoche à Z = 5mm (au lieu du haut de la paroi)
            translate([-1, (pcb_l+2*wall)/2 - 3, 4])
                cube([wall + 2, 6, 2.5]);
            translate([pcb_w + wall - 1, (pcb_l+2*wall)/2 - 3, 4])
                cube([wall + 2, 6, 2.5]);
        }
        
        // OREILLES DE FIXATION
        difference() {
            union() {
                translate([-(wall + 4), (pcb_l + 2*wall)/2 - 5, 0]) cube([6, 10, wall]);
                translate([pcb_w + 2*wall, (pcb_l + 2*wall)/2 - 5, 0]) cube([6, 10, wall]);
            }
            translate([-(wall + 1), (pcb_l + 2*wall)/2, -1]) cylinder(h=wall + 2, r=1.75);
            translate([pcb_w + 2*wall + 3, (pcb_l + 2*wall)/2, -1]) cylinder(h=wall + 2, r=1.75);
        }
    }
}

// --- MODULE COUVERCLE ---
module boitier_couvercle() {
    clip_w = 4.5;
    bras_ep = 0.8; // Affiné pour la souplesse
    longueur_bras = h_interne - 4; // Bras très long pour faire levier

    union() {
        // Plaque supérieure ventilée
        difference() {
            cube([pcb_w + 2*wall, pcb_l + 2*wall, wall]);
            for (i = [0 : 3]) {
                translate([wall + 2, wall + 2 + (i*2.5), -1])
                    cube([pcb_w - 4, 1.2, wall + 2]);
            }
        }
        
        // --- CLIP GAUCHE ---
        translate([wall + 0.1, (pcb_l + 2*wall)/2 - clip_w/2, -longueur_bras]) {
            cube([bras_ep, clip_w, longueur_bras]); // Le bras flexible
            
            // Ergot déplacé vers le bas pour s'aligner sur la nouvelle fenêtre
            translate([0, 0, 2]) // Positionné pour tomber dans l'encoche à Z=5
                rotate([0,180, 0])
                polyhedron(
                    points=[[0,0,0], [0.8,0,0], [0.8,clip_w,0], [0,clip_w,0], [0,0,2], [0,clip_w,2]],
                    faces=[[0,1,2,3],[4,5,2,1],[0,4,1],[5,4,3,2],[0,3,4]]
                );
        }
        
        // --- CLIP DROIT ---
        translate([pcb_w + 2*wall - wall - bras_ep - 0.1, (pcb_l + 2*wall)/2 - clip_w/2, -longueur_bras]) {
            cube([bras_ep, clip_w, longueur_bras]);
            
            // Ergot déplacé
            translate([bras_ep, 0, 2])
                mirror([0,0,1])
                polyhedron(
                    points=[[0,0,0], [0.8,0,0], [0.8,clip_w,0], [0,clip_w,0], [0,0,2], [0,clip_w,2]],
                    faces=[[0,1,2,3],[4,5,2,1],[0,4,1],[5,4,3,2],[0,3,4]]
                );
        }
    }
}