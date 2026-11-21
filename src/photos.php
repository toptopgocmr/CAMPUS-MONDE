<?php
/* =========================================================
   CAMPUS MONDE — photos du site (licences libres, Wikimedia Commons)
   Chaque photo est d'abord cherchée dans public/photos/<clé>.jpg (copie locale) ;
   à défaut, elle est affichée depuis Wikimedia. Les crédits (auteur, licence) sont
   obligatoires pour les licences CC BY et CC BY-SA : ils s'affichent sur chaque photo
   et dans la page Mentions légales. Remplacez une photo en déposant votre propre fichier
   public/photos/<clé>.jpg (crédit à adapter ci-dessous, ou supprimer l'entrée).
   ========================================================= */
declare(strict_types=1);

const PHOTO_LIB = [
 "accueil" => [
  "thumb" => "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f4/Qu%C3%A9bec_city_at_night%2C_view_from_L%C3%A9vis_city.jpg/1920px-Qu%C3%A9bec_city_at_night%2C_view_from_L%C3%A9vis_city.jpg",
  "page" => "https://commons.wikimedia.org/wiki/File:Qu%C3%A9bec_city_at_night,_view_from_L%C3%A9vis_city.jpg",
  "lic" => "CC BY-SA 4.0",
  "licurl" => "https://creativecommons.org/licenses/by-sa/4.0",
  "artist" => "Wilfredor",
  "t" => "Québec de nuit, vue depuis Lévis"
 ],
 "canada" => [
  "thumb" => "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/22/Kondiaronk_Belvedere%2C_Montreal_city%2C_Canada.jpg/1280px-Kondiaronk_Belvedere%2C_Montreal_city%2C_Canada.jpg",
  "page" => "https://commons.wikimedia.org/wiki/File:Kondiaronk_Belvedere,_Montreal_city,_Canada.jpg",
  "lic" => "CC0",
  "licurl" => "https://creativecommons.org/publicdomain/zero/1.0/",
  "artist" => "Wilfredor",
  "t" => "Montréal depuis le belvédère Kondiaronk"
 ],
 "france" => [
  "thumb" => "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/24/Stra%C3%9Fburg_%28Frankreich%29%2C_Petite_France_--_2011_--_1759.jpg/1280px-Stra%C3%9Fburg_%28Frankreich%29%2C_Petite_France_--_2011_--_1759.jpg",
  "page" => "https://commons.wikimedia.org/wiki/File:Stra%C3%9Fburg_(Frankreich),_Petite_France_--_2011_--_1759.jpg",
  "lic" => "CC BY-SA 4.0",
  "licurl" => "https://creativecommons.org/licenses/by-sa/4.0",
  "artist" => "Dietmar Rabich",
  "t" => "Strasbourg, la Petite France"
 ],
 "belgique" => [
  "thumb" => "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/26/Grand-Place%2C_Brussels_-_panorama%2C_June_2018.jpg/1280px-Grand-Place%2C_Brussels_-_panorama%2C_June_2018.jpg",
  "page" => "https://commons.wikimedia.org/wiki/File:Grand-Place,_Brussels_-_panorama,_June_2018.jpg",
  "lic" => "CC BY-SA 4.0",
  "licurl" => "https://creativecommons.org/licenses/by-sa/4.0",
  "artist" => "Celuici",
  "t" => "Bruxelles, la Grand-Place"
 ],
 "maroc" => [
  "thumb" => "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9e/Hassan_Tower_Columns_Rabat_Nov25_A7CR_08839.jpg/1280px-Hassan_Tower_Columns_Rabat_Nov25_A7CR_08839.jpg",
  "page" => "https://commons.wikimedia.org/wiki/File:Hassan_Tower_Columns_Rabat_Nov25_A7CR_08839.jpg",
  "lic" => "CC BY-SA 4.0",
  "licurl" => "https://creativecommons.org/licenses/by-sa/4.0",
  "artist" => "Timothy A. Gonsalves",
  "t" => "Rabat, la tour Hassan"
 ],
 "conseiller" => [
  "thumb" => "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0f/Int%C3%A9rieur_de_la_BU_Sciences_et_Techniques%2C_2024_%2801%29.jpg/1280px-Int%C3%A9rieur_de_la_BU_Sciences_et_Techniques%2C_2024_%2801%29.jpg",
  "page" => "https://commons.wikimedia.org/wiki/File:Int%C3%A9rieur_de_la_BU_Sciences_et_Techniques,_2024_(01).jpg",
  "lic" => "CC BY-SA 4.0",
  "licurl" => "https://creativecommons.org/licenses/by-sa/4.0",
  "artist" => "Poslovitch",
  "t" => "Bibliothèque universitaire, Nancy"
 ],
 "etudiant-ordinateur" => [
  "thumb" => "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/05/ULB_-_Biblioth%C3%A8que_de_droit_2.jpg/1280px-ULB_-_Biblioth%C3%A8que_de_droit_2.jpg",
  "page" => "https://commons.wikimedia.org/wiki/File:ULB_-_Biblioth%C3%A8que_de_droit_2.jpg",
  "lic" => "CC BY-SA 4.0",
  "licurl" => "https://creativecommons.org/licenses/by-sa/4.0",
  "artist" => "Fawaz.tairou",
  "t" => "Bibliothèque de droit de l'ULB"
 ],
 "campus" => [
  "thumb" => "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/38/Universit%C3%A9_Laval_3.jpg/1280px-Universit%C3%A9_Laval_3.jpg",
  "page" => "https://commons.wikimedia.org/wiki/File:Universit%C3%A9_Laval_3.jpg",
  "lic" => "CC BY-SA 4.0",
  "licurl" => "https://creativecommons.org/licenses/by-sa/4.0",
  "artist" => "Wilfredor",
  "t" => "Campus de l'Université Laval"
 ],
 "aeroport" => [
  "thumb" => "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a3/Airplane_wing_sky_and_clouds.jpg/1280px-Airplane_wing_sky_and_clouds.jpg",
  "page" => "https://commons.wikimedia.org/wiki/File:Airplane_wing_sky_and_clouds.jpg",
  "lic" => "CC BY-SA 3.0",
  "licurl" => "https://creativecommons.org/licenses/by-sa/3.0",
  "artist" => "Tobias1984",
  "t" => "En route vers vos études"
 ],
 "arrivee" => [
  "thumb" => "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d1/Auditoires_des_Sciences_and_Place_des_Sciences_photographed_on_a_drizzly_evening_in_December_%28Ecole_Polytechnique_de_Louvain%2C_Ottignies-Louvain-la-Neuve%2C_Belgium%29.jpg/1280px-thumbnail.jpg",
  "page" => "https://commons.wikimedia.org/wiki/File:Auditoires_des_Sciences_and_Place_des_Sciences_photographed_on_a_drizzly_evening_in_December_(Ecole_Polytechnique_de_Louvain,_Ottignies-Louvain-la-Neuve,_Belgium).jpg",
  "lic" => "CC BY 4.0",
  "licurl" => "https://creativecommons.org/licenses/by/4.0",
  "artist" => "Trougnouf",
  "t" => "Louvain-la-Neuve, place des Sciences"
 ],
 "inst-laval" => [
  "thumb" => "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f9/Universit%C3%A9_Laval%2C_Quebec_Canada_3.jpg/1280px-Universit%C3%A9_Laval%2C_Quebec_Canada_3.jpg",
  "page" => "https://commons.wikimedia.org/wiki/File:Universit%C3%A9_Laval,_Quebec_Canada_3.jpg",
  "lic" => "CC0",
  "licurl" => "https://creativecommons.org/publicdomain/zero/1.0/",
  "artist" => "Wilfredor",
  "t" => "Université Laval, pavillon Louis-Jacques-Casault"
 ],
 "inst-umontreal" => [
  "thumb" => "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Universit%C3%A9_de_Montr%C3%A9al%2C_Pavillon_Roger-Gaudry.JPG/1280px-Universit%C3%A9_de_Montr%C3%A9al%2C_Pavillon_Roger-Gaudry.JPG",
  "page" => "https://commons.wikimedia.org/wiki/File:Universit%C3%A9_de_Montr%C3%A9al,_Pavillon_Roger-Gaudry.JPG",
  "lic" => "CC BY-SA 4.0",
  "licurl" => "https://creativecommons.org/licenses/by-sa/4.0",
  "artist" => "Laurent Bélanger",
  "t" => "Université de Montréal, pavillon Roger-Gaudry"
 ],
 "inst-lorraine" => [
  "thumb" => "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/34/Biblioth%C3%A8que_universitaire_Sciences_et_Techniques%2C_Nancy%2C_2024.jpg/1280px-Biblioth%C3%A8que_universitaire_Sciences_et_Techniques%2C_Nancy%2C_2024.jpg",
  "page" => "https://commons.wikimedia.org/wiki/File:Biblioth%C3%A8que_universitaire_Sciences_et_Techniques,_Nancy,_2024.jpg",
  "lic" => "CC BY-SA 4.0",
  "licurl" => "https://creativecommons.org/licenses/by-sa/4.0",
  "artist" => "Poslovitch",
  "t" => "Université de Lorraine, BU Sciences et Techniques"
 ],
 "inst-unistra" => [
  "thumb" => "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/12/Palais_Universitaire_de_Strasbourg_%282%29.jpg/1280px-Palais_Universitaire_de_Strasbourg_%282%29.jpg",
  "page" => "https://commons.wikimedia.org/wiki/File:Palais_Universitaire_de_Strasbourg_(2).jpg",
  "lic" => "CC BY-SA 4.0",
  "licurl" => "https://creativecommons.org/licenses/by-sa/4.0",
  "artist" => "Nguyễn Mai Trang",
  "t" => "Université de Strasbourg, Palais universitaire"
 ],
 "inst-ulb" => [
  "thumb" => "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/83/Clock_Tower_of_the_ULB_Solbosch_Campus_in_the_City_of_Brussels.JPG/1280px-Clock_Tower_of_the_ULB_Solbosch_Campus_in_the_City_of_Brussels.JPG",
  "page" => "https://commons.wikimedia.org/wiki/File:Clock_Tower_of_the_ULB_Solbosch_Campus_in_the_City_of_Brussels.JPG",
  "lic" => "CC BY 3.0",
  "licurl" => "https://creativecommons.org/licenses/by/3.0",
  "artist" => "Jndemi",
  "t" => "ULB, campus du Solbosch"
 ],
 "inst-uclouvain" => [
  "thumb" => "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ef/Auditoires_Sainte-Barbe_photographed_from_the_Vinci_building_on_a_drizzly_evening_in_December_%28Ecole_Polytechnique_de_Louvain%2C_Ottignies-Louvain-la-Neuve%2C_Belgium%29.jpg/1280px-thumbnail.jpg",
  "page" => "https://commons.wikimedia.org/wiki/File:Auditoires_Sainte-Barbe_photographed_from_the_Vinci_building_on_a_drizzly_evening_in_December_(Ecole_Polytechnique_de_Louvain,_Ottignies-Louvain-la-Neuve,_Belgium).jpg",
  "lic" => "CC BY 4.0",
  "licurl" => "https://creativecommons.org/licenses/by/4.0",
  "artist" => "Trougnouf",
  "t" => "UCLouvain, auditoires Sainte-Barbe"
 ],
 "inst-um5" => [
  "thumb" => "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7c/UM5_Presidence.jpg/1280px-UM5_Presidence.jpg",
  "page" => "https://commons.wikimedia.org/wiki/File:UM5_Presidence.jpg",
  "lic" => "CC BY-SA 4.0",
  "licurl" => "https://creativecommons.org/licenses/by-sa/4.0",
  "artist" => "Ftpmail",
  "t" => "Université Mohammed V, présidence"
 ],
 "ville-montreal" => [
  "thumb" => "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2c/Montreal_-_QC_-_Skyline.jpg/1280px-Montreal_-_QC_-_Skyline.jpg",
  "page" => "https://commons.wikimedia.org/wiki/File:Montreal_-_QC_-_Skyline.jpg",
  "lic" => "CC BY 3.0",
  "licurl" => "https://creativecommons.org/licenses/by/3.0",
  "artist" => "Taxiarchos228",
  "t" => "Montréal"
 ],
 "ville-quebec" => [
  "thumb" => "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d9/Chateau_Frontenac_illuminated_at_night_in_Quebec_City.jpg/1280px-Chateau_Frontenac_illuminated_at_night_in_Quebec_City.jpg",
  "page" => "https://commons.wikimedia.org/wiki/File:Chateau_Frontenac_illuminated_at_night_in_Quebec_City.jpg",
  "lic" => "CC0",
  "licurl" => "https://creativecommons.org/publicdomain/zero/1.0/",
  "artist" => "Wilfredor",
  "t" => "Québec"
 ],
 "ville-paris" => [
  "thumb" => "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e7/Front_de_Seine_as_seen_from_Pont_Mirabeau_140412_1.jpg/1280px-Front_de_Seine_as_seen_from_Pont_Mirabeau_140412_1.jpg",
  "page" => "https://commons.wikimedia.org/wiki/File:Front_de_Seine_as_seen_from_Pont_Mirabeau_140412_1.jpg",
  "lic" => "CC BY-SA 3.0",
  "licurl" => "https://creativecommons.org/licenses/by-sa/3.0",
  "artist" => "DXR",
  "t" => "Paris"
 ],
 "ville-strasbourg" => [
  "thumb" => "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/65/Gerwerstub_1572%2C_maison_des_tanneurs%2C_Strasbourg_%282014%29.jpg/1280px-Gerwerstub_1572%2C_maison_des_tanneurs%2C_Strasbourg_%282014%29.jpg",
  "page" => "https://commons.wikimedia.org/wiki/File:Gerwerstub_1572,_maison_des_tanneurs,_Strasbourg_(2014).jpg",
  "lic" => "CC BY-SA 4.0",
  "licurl" => "https://creativecommons.org/licenses/by-sa/4.0",
  "artist" => "JoachimKohler-HB",
  "t" => "Strasbourg"
 ],
 "ville-nancy" => [
  "thumb" => "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b4/Nancy_Place_Stanislas_BW_2015-07-18_13-48-46.jpg/1280px-Nancy_Place_Stanislas_BW_2015-07-18_13-48-46.jpg",
  "page" => "https://commons.wikimedia.org/wiki/File:Nancy_Place_Stanislas_BW_2015-07-18_13-48-46.jpg",
  "lic" => "CC BY-SA 3.0",
  "licurl" => "https://creativecommons.org/licenses/by-sa/3.0",
  "artist" => "Berthold Werner",
  "t" => "Nancy"
 ],
 "ville-bruxelles" => [
  "thumb" => "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7b/Grand-Place_Flower_Carpet_2018_%2818mm%29.jpg/1280px-Grand-Place_Flower_Carpet_2018_%2818mm%29.jpg",
  "page" => "https://commons.wikimedia.org/wiki/File:Grand-Place_Flower_Carpet_2018_(18mm).jpg",
  "lic" => "CC BY 4.0",
  "licurl" => "https://creativecommons.org/licenses/by/4.0",
  "artist" => "Trougnouf",
  "t" => "Bruxelles"
 ],
 "ville-rabat" => [
  "thumb" => "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cf/Hassan_Tower_01.jpg/1280px-Hassan_Tower_01.jpg",
  "page" => "https://commons.wikimedia.org/wiki/File:Hassan_Tower_01.jpg",
  "lic" => "CC BY-SA 3.0",
  "licurl" => "https://creativecommons.org/licenses/by-sa/3.0",
  "artist" => "Bernard Gagnon",
  "t" => "Rabat"
 ]
];

function photos_public(): array {
    $out = [];
    foreach (PHOTO_LIB as $k => $p) {
        $local = is_file(ROOT . "/public/photos/$k.jpg");
        $out[$k] = ['local' => $local, 'url' => $p['thumb'], 'page' => $p['page'], 'author' => $p['artist'], 'license' => $p['lic'], 'licenseUrl' => $p['licurl'], 'title' => $p['t']];
    }
    return $out;
}
// Copie les photos dans public/photos (pour ne plus dépendre de Wikimedia une fois en ligne)
function photos_sync(bool $force = false): array {
    $dir = ROOT . '/public/photos'; $res = [];
    if (!is_dir($dir)) @mkdir($dir, 0775, true);
    $ctx = stream_context_create(['http' => ['timeout' => 25, 'header' => "User-Agent: CampusMonde/1.0 (site Campus Monde; contact Billenium.corp@gmail.com)\r\n"], 'ssl' => ['verify_peer' => true]]);
    foreach (PHOTO_LIB as $k => $p) {
        $f = "$dir/$k.jpg";
        if (is_file($f) && !$force) { $res[$k] = 'déjà présente'; continue; }
        $data = @file_get_contents($p['thumb'], false, $ctx);
        if ($data === false && function_exists('curl_init')) {
            $c = curl_init($p['thumb']); curl_setopt_array($c, [CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_TIMEOUT => 25, CURLOPT_USERAGENT => 'CampusMonde/1.0 (site Campus Monde)']);
            $data = curl_exec($c); curl_close($c);
        }
        if (!$data || substr($data, 0, 3) !== "\xFF\xD8\xFF") { $res[$k] = 'échec'; continue; }
        file_put_contents($f, $data); $res[$k] = 'copiée (' . round(strlen($data) / 1024) . ' Ko)';
    }
    return $res;
}
