// --- PARAMETRES ---
$fn = 60; // Haute qualité pour des arrondis bien lisses

// --- CONNECTEUR D'ALIM (DC-099) ---
connector_diam = 7; 
// Profondeur nécessaire à l'intérieur pour le corps du connecteur + fils
connector_internal_depth = 24; 

// --- DIMENSIONS ESP32 ---
esp_dim_x_box = 63; // Petit coté
esp_dim_y_box = 69; // Grand coté (borniers)
esp_height = 20;

// Entraxes ESP
esp_hole_x_box = 59; 
esp_hole_y_box = 65; 

esp_margin_x = (esp_dim_x_box - esp_hole_x_box) / 2;
esp_margin_y = (esp_dim_y_box - esp_hole_y_box) / 2;

// --- DIMENSIONS DC-DC ---
dc_width = 21;
dc_len = 44;
dc_height = 15;
dc_hole_dist_x = 16;
dc_hole_dist_y = 32; 

// --- PARAMETRES BOITIER ---
wall = 2.5;         
base_height = 3;    
internal_margin = 7; 
comp_gap = 8; 

// Calcul automatique des dimensions internes
total_int_x = internal_margin + esp_dim_x_box + comp_gap + dc_width+internal_margin;
total_int_y = internal_margin + esp_dim_y_box + internal_margin;
total_z = max(esp_height, dc_height) + 5;

// --- MODULES ---

// Module pour créer un cube à coins arrondis
module r_cube(x, y, z, r) {
    hull() {
        translate([r, r, 0]) cylinder(h=z, r=r);
        translate([x-r, r, 0]) cylinder(h=z, r=r);
        translate([x-r, y-r, 0]) cylinder(h=z, r=r);
        translate([r, y-r, 0]) cylinder(h=z, r=r);
    }
}

module standoff(x, y, h, d_hole) {
    translate([x, y, 0]) {
        difference() {
            cylinder(h=h, d=7); 
            cylinder(h=h+0.1, d=d_hole); 
        }
    }
}

module rounded_rect_base(x, y, z, r) {
    translate([r, r, 0]) minkowski() {
        cube([x - 2*r, y - 2*r, z / 2]); 
        cylinder(r=r, h=z/2);
    }
}

module box_base() {
    difference() {
        // 1. Coque extérieure + OREILLES ARRONDIES
        union() {
            rounded_rect_base(total_int_x + 2*wall, total_int_y + 2*wall, total_z + base_height, 3);
            
            // Oreille Gauche Arrondie
            translate([0, total_int_y/2 + wall, 0]) difference() {
                hull() {
                     translate([0, -10, 0]) cube([1, 20, 3]); 
                     translate([-10, 0, 0]) cylinder(h=3, d=20); 
                }
                translate([-10, 0, -1]) cylinder(h=5, d=4.5); 
            }
            
            // Oreille Droite Arrondie
            translate([total_int_x + 2*wall, total_int_y/2 + wall, 0]) difference() {
                hull() {
                     translate([-1, -10, 0]) cube([1, 20, 3]); 
                     translate([10, 0, 0]) cylinder(h=3, d=20); 
                }
                translate([10, 0, -1]) cylinder(h=5, d=4.5); 
            }
        }

        // 2. Vide intérieur
        translate([wall, wall, base_height]) 
            rounded_rect_base(total_int_x, total_int_y, total_z + 10, 2);
            
        // 3. --- DECOUPES ARRONDIES ---
        
        bornier_start_x = wall + internal_margin;
        
        // Fente Avant (Arrondie visible de face)
        // On pivote le r_cube de 90° sur X pour que l'arrondi soit sur le mur
        translate([bornier_start_x + 5, wall*3, base_height + 4])
            rotate([90, 0, 0])
            r_cube(esp_dim_x_box - 10, 7, wall*4, 2); 
            
        // Fente Arrière (Arrondie visible de face)
        translate([bornier_start_x + 5, total_int_y + wall*3, base_height + 4])
            rotate([90, 0, 0])
            r_cube(esp_dim_x_box - 10, 7, wall*4, 2);
            
        // Trou Connecteur DC-099
        hole_height = base_height + (total_z / 2);        
        connector_x = esp_x + esp_dim_x_box + comp_gap + dc_width/2;
        translate([connector_x , total_int_y, hole_height])
            rotate([0, 90, 90])
            cylinder(h=10, d=connector_diam);

        // Trous vis couvercle
        positions_lid = [[0,0], [total_int_x+2*wall, 0], [0, total_int_y+2*wall], [total_int_x+2*wall, total_int_y+2*wall]];
        for(p = positions_lid) {
            translate([p[0] > 10 ? p[0]-5 : 5, p[1] > 10 ? p[1]-5 : 5, total_z])
                cylinder(h=20, d=2.8, center=true); 
        }
    }

    // --- SUPPORTS ESP32 ---
    esp_x = wall + internal_margin;
    esp_y = wall + internal_margin;
    
    translate([esp_x, esp_y, base_height]) {
        translate([esp_margin_x, esp_margin_y, 0]) {
            standoff(0, 0, 5, 1.8);
            standoff(esp_hole_x_box, 0, 5, 1.8);
            standoff(0, esp_hole_y_box, 5, 1.8);
            standoff(esp_hole_x_box, esp_hole_y_box, 5, 1.8);
        }
    }

    // --- SUPPORTS DC-DC ---
    dc_x = esp_x + esp_dim_x_box + comp_gap;
    dc_y = wall + internal_margin;
    
    translate([dc_x, dc_y, base_height]) {
        dc_margin_x_calc = (dc_width - dc_hole_dist_x) / 2;        
        dc_margin_y_calc = (dc_len - dc_hole_dist_y) / 2;
        translate([dc_margin_x_calc, dc_margin_y_calc, 0]) standoff(0, 0, 4, 1.8);
        translate([dc_width - dc_margin_x_calc, dc_len - dc_margin_y_calc, 0]) standoff(0, 0, 4, 1.8);
    }
    
    // Colonnes coins
    positions_col = [[0,0], [total_int_x+2*wall, 0], [0, total_int_y+2*wall], [total_int_x+2*wall, total_int_y+2*wall]];
    for(p = positions_col) {
        translate([p[0] > 10 ? p[0]-5 : 5, p[1] > 10 ? p[1]-5 : 5, base_height])
             difference() {
                cylinder(h=total_z, d=9); 
                cylinder(h=total_z, d=3.5); 
             }
    }
}

module box_lid() {
    translate([0, -total_int_y - 30, 0]) { 
        difference() {
            outer_x = total_int_x + 2*wall;
            outer_y = total_int_y + 2*wall;
            union() {
                rounded_rect_base(outer_x , outer_y, 4, 3);
            
                // Lèvre intérieure (Carrée simple pour rentrer dans le trou)
                translate([outer_x / 2, outer_y/2, 4])
                difference() {
                    // 1. La forme extérieure de la lèvre
                    cube([total_int_x - 0.4, total_int_y - 0.4, 4], center=true); 
                    
                    // 2. Le trou central de la lèvre
                    cube([total_int_x - 4.4, total_int_y - 4.4, 5], center=true);
                    
                    // 3. --- DÉCOUPE DES 4 COINS ---
                    // On place un cube à chaque coin pour supprimer la matière
                    // Cela laisse la place aux trous de vis/piliers du boitier
                    cut_size = 18; // Taille du cube de coupe (9mm coupés vers l'intérieur)
                    lim_x = (total_int_x - 0.4) / 2;
                    lim_y = (total_int_y - 0.4) / 2;
                    
                    for (ix = [-1, 1]) {
                        for (iy = [-1, 1]) {
                            translate([ix * lim_x, iy * lim_y, 0])
                                cube([cut_size, cut_size, 10], center=true);
                        }
                    }
                }
            }
            
            // Trous vis
            positions_lid = [[0,0], [outer_x, 0], [0, outer_y], [outer_x, total_int_y+2*wall]];
            for(p = positions_lid) {
                translate([p[0] > 10 ? p[0]-5 : 5, p[1] > 10 ? p[1]-5 : 5, -1]) {
                    cylinder(h=10, d=3.5); 
                    translate([0, 0, 1.5]) cylinder(h=3, d=6, center=true); // Tête noyée
                }
            }
            
            // --- FENTES TOURNEVIS ARRONDIES ---
            esp_x = wall + internal_margin;
            esp_y = wall + internal_margin;
            
            translate([esp_x + 5, esp_y + 6, -1])
                r_cube(esp_dim_x_box - 10, 6, 10, 2); 
                
            translate([esp_x + 5, esp_y + esp_dim_y_box - 14, -1])
                r_cube(esp_dim_x_box - 10, 6, 10, 2); 
                
            // Aération ESP
            translate([20, total_int_y/2 + wall, 0]){         
                for(i = [0 : 10]) {
                    translate([i * 4, 0, 0])
                    cube([2, 20, 10], center=true);
                }
            }
            
            // Aération DC
            translate([85, 40 + wall, 0]){         
                for(i = [0 : 5]) {
                    translate([0, i * 4, 0])
                    cube([20, 2, 10], center=true);
                }
            }   
        }
    }
}

box_base();
box_lid();