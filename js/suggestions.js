/* ============================================
   suggestions.js — Suggestions de lieux au Japon
   Base curatée étendue + filtre carte
   ============================================ */

const SuggestionsManager = {
  isOpen: false,
  showOnMap: true, // Activé par défaut
  _mapMarkers: [],

  SUGGESTIONS: {
    temple: {
      label: '⛩️ Temples & Sanctuaires',
      places: [
        // --- Kyoto ---
        { name: 'Fushimi Inari-taisha', lat: 34.9671, lng: 135.7727, notes: 'Des milliers de torii vermillon — le sanctuaire le plus photographié du Japon. Gratuit, ouvert 24h. Kyoto.', difficulty: '🟢' },
        { name: 'Kinkaku-ji (Pavillon d\'Or)', lat: 35.0394, lng: 135.7292, notes: 'Pavillon recouvert de feuille d\'or au bord d\'un lac. Entrée ¥400. Kyoto.', difficulty: '🟢' },
        { name: 'Kiyomizu-dera', lat: 34.9949, lng: 135.7850, notes: 'Temple sur pilotis avec vue panoramique sur Kyoto. Sublime au coucher du soleil.', difficulty: '🟢' },
        { name: 'Ginkaku-ji (Pavillon d\'Argent)', lat: 35.0270, lng: 135.7983, notes: 'Jardin zen sublime, début du Chemin de la Philosophie. Kyoto.', difficulty: '🟢' },
        { name: 'Ryoan-ji', lat: 35.0345, lng: 135.7182, notes: 'Le jardin zen de pierres le plus célèbre au monde. Méditation. Kyoto.', difficulty: '🟢' },
        { name: 'Tofuku-ji', lat: 34.9761, lng: 135.7740, notes: 'Sublime en automne avec ses érables rouges. Pont Tsutenkyo. Kyoto.', difficulty: '🟢' },
        { name: 'Daigo-ji', lat: 34.9514, lng: 135.8216, notes: 'Pagode à 5 étages, cerisiers légendaires. UNESCO. Kyoto.', difficulty: '🟢' },
        { name: 'Nanzen-ji', lat: 35.0112, lng: 135.7933, notes: 'Temple zen avec aqueduc en briques. Jardin sublime. Kyoto.', difficulty: '🟢' },
        { name: 'Byodo-in (Uji)', lat: 34.8894, lng: 135.8077, notes: 'Figuré sur la pièce de 10¥. Pavillon du Phoenix. UNESCO. Uji.', difficulty: '🟢' },
        // --- Tokyo ---
        { name: 'Senso-ji', lat: 35.7148, lng: 139.7967, notes: 'Plus ancien temple de Tokyo, à Asakusa. Nakamise-dori pour le shopping.', difficulty: '🟢' },
        { name: 'Meiji-jingū', lat: 35.6764, lng: 139.6993, notes: 'Grand sanctuaire shinto en plein Harajuku, entouré d\'une forêt. Tokyo.', difficulty: '🟢' },
        { name: 'Nezu-jinja', lat: 35.7197, lng: 139.7615, notes: 'Sanctuaire caché avec des mini torii et azalées au printemps. Tokyo.', difficulty: '🟢' },
        { name: 'Zojo-ji', lat: 35.6580, lng: 139.7487, notes: 'Temple devant la Tokyo Tower. Rangées de jizo (statues d\'enfants). Tokyo.', difficulty: '🟢' },
        // --- Nara ---
        { name: 'Todai-ji', lat: 34.6891, lng: 135.8399, notes: 'Abrite le plus grand Bouddha en bronze du Japon. Nara.', difficulty: '🟢' },
        { name: 'Kasuga-taisha', lat: 34.6813, lng: 135.8498, notes: 'Sanctuaire aux 3000 lanternes dans la forêt de Nara. Magique la nuit.', difficulty: '🟢' },
        { name: 'Horyuji', lat: 34.6146, lng: 135.7344, notes: 'Plus ancien édifice en bois du monde. UNESCO. Ikaruga.', difficulty: '🟡' },
        // --- Hiroshima / Miyajima ---
        { name: 'Itsukushima-jinja', lat: 34.2961, lng: 132.3199, notes: 'Le fameux torii flottant de Miyajima. UNESCO. Hiroshima.', difficulty: '🟢' },
        // --- Nikko ---
        { name: 'Nikko Toshogu', lat: 36.7580, lng: 139.5988, notes: 'Mausolée orné exceptionnel. UNESCO. Les 3 singes célèbres. Nikko.', difficulty: '🟡' },
        // --- Kamakura ---
        { name: 'Kotoku-in (Grand Bouddha)', lat: 35.3167, lng: 139.5356, notes: 'Bouddha en bronze de 13m en plein air. Icône de Kamakura.', difficulty: '🟢' },
        { name: 'Zeniarai Benzaiten', lat: 35.3265, lng: 139.5380, notes: 'Petit sanctuaire dans une grotte à Kamakura. On y lave ses pièces.', difficulty: '🟡' },
        { name: 'Hokoku-ji (Temple du Bambou)', lat: 35.3154, lng: 139.5615, notes: 'Jardin de bambous serein avec salon de thé matcha. Kamakura.', difficulty: '🟢' },
        { name: 'Hasedera', lat: 35.3095, lng: 139.5318, notes: 'Vue mer sublime et jardin de jizo. Hortensias en juin. Kamakura.', difficulty: '🟢' },
        // --- Koyasan ---
        { name: 'Okunoin (Koyasan)', lat: 34.2134, lng: 135.5921, notes: '200 000 tombes dans la forêt de cèdres. Le cimetière le plus mystique.', difficulty: '🟡' },
        // --- Yamagata ---
        { name: 'Yamadera (Risshaku-ji)', lat: 38.3128, lng: 140.4384, notes: '1015 marches — vue époustouflante. Yamagata.', difficulty: '🔴' },
        // --- Kanazawa ---
        { name: 'Kenroku-en', lat: 36.5625, lng: 136.6625, notes: 'Un des 3 plus beaux jardins du Japon. Magnifique en toute saison. Kanazawa.', difficulty: '🟢' },
        // --- Aomori ---
        { name: 'Sannai-Maruyama', lat: 40.8122, lng: 140.6969, notes: 'Site archéologique Jomon (5000 ans). UNESCO 2021. Aomori.', difficulty: '🟡' },
        // --- Shikoku ---
        { name: 'Temple 1 Ryozen-ji (Pèlerinage 88)', lat: 34.1591, lng: 134.5015, notes: 'Point de départ du pèlerinage des 88 temples de Shikoku. Naruto.', difficulty: '🟡' },
      ]
    },
    restaurant: {
      label: '🍜 Restaurants & Street Food',
      places: [
        // --- Tokyo ---
        { name: 'Ichiran Ramen Shibuya', lat: 35.6595, lng: 139.6987, notes: 'Ramen tonkotsu culte en cabine individuelle. Tokyo.', difficulty: '🟢' },
        { name: 'Tsukiji Outer Market', lat: 35.6654, lng: 139.7707, notes: 'Marché historique. Sushi frais, tamagoyaki, street food dès 5h. Tokyo.', difficulty: '🟢' },
        { name: 'Omoide Yokocho', lat: 35.6938, lng: 139.6990, notes: 'Piss Alley à Shinjuku — ruelles de yakitori et bière. Tokyo.', difficulty: '🟢' },
        { name: 'Fuunji Ramen', lat: 35.6883, lng: 139.6993, notes: 'Tsukemen parmi les meilleurs de Tokyo. File d\'attente.', difficulty: '🟢' },
        { name: 'Gyukatsu Motomura Shibuya', lat: 35.6602, lng: 139.6978, notes: 'Bœuf pané mi-cuit grillé à table. Concept unique. Tokyo.', difficulty: '🟢' },
        { name: 'Tofuya-Ukai Tokyo', lat: 35.6570, lng: 139.7453, notes: 'Kaiseki de tofu au pied de la Tokyo Tower. Haut de gamme.', difficulty: '🟡' },
        { name: 'Afuri Ramen Ebisu', lat: 35.6472, lng: 139.7102, notes: 'Ramen yuzu shio léger et raffiné. Concept moderne. Tokyo.', difficulty: '🟢' },
        { name: 'Sushi Dai (Toyosu)', lat: 35.6455, lng: 139.7826, notes: 'Sushi bar légendaire dans le marché de Toyosu. 3h d\'attente. Tokyo.', difficulty: '🟡' },
        { name: 'Hoppy-dori (Asakusa)', lat: 35.7115, lng: 139.7944, notes: 'Rue de petits bars populaires près de Senso-ji. Ambiance locale. Tokyo.', difficulty: '🟢' },
        { name: 'Tonkatsu Maisen Aoyama', lat: 35.6645, lng: 139.7113, notes: 'Le meilleur tonkatsu de Tokyo dans un ancien bain public. Aoyama.', difficulty: '🟢' },
        // --- Osaka ---
        { name: 'Dotonbori', lat: 34.6687, lng: 135.5013, notes: 'Rue emblématique pour le street food : takoyaki, okonomiyaki. Osaka.', difficulty: '🟢' },
        { name: 'Kuromon Market', lat: 34.6622, lng: 135.5068, notes: '\"La cuisine d\'Osaka\". Fruits de mer grillés, uni, mochi, wagyu.', difficulty: '🟢' },
        { name: 'Shinsekai (Kushikatsu)', lat: 34.6523, lng: 135.5062, notes: 'Quartier rétro célèbre pour les brochettes panées. Ambiance Showa. Osaka.', difficulty: '🟢' },
        { name: 'Isshin Takoyaki', lat: 34.6685, lng: 135.5015, notes: 'Les meilleurs takoyaki de Dotonbori. Croustillant, fondant. Osaka.', difficulty: '🟢' },
        { name: 'Rikuro\'s Cheesecake Namba', lat: 34.6641, lng: 135.5006, notes: 'Cheesecake japonais jiggly emblématique d\'Osaka. File d\'attente.', difficulty: '🟢' },
        // --- Kyoto ---
        { name: 'Nishiki Market', lat: 35.0050, lng: 135.7649, notes: 'La \"cuisine de Kyoto\" — 400m de stands : mochi, tsukemono, matcha.', difficulty: '🟢' },
        { name: 'Gion Kappa Restaurant', lat: 35.0040, lng: 135.7740, notes: 'Cuisine traditionnelle dans le quartier des geishas. Kyoto.', difficulty: '🟡' },
        { name: 'Arashiyama Tofu', lat: 35.0143, lng: 135.6721, notes: 'Tofu yudofu et dengaku devant la bambouseraie. Kyoto.', difficulty: '🟢' },
        // --- Fukuoka ---
        { name: 'Yatai de Nakasu', lat: 33.5912, lng: 130.4035, notes: 'Stands de ramen en plein air au bord de la rivière. Fukuoka.', difficulty: '🟢' },
        { name: 'Shin Shin Ramen Tenjin', lat: 33.5903, lng: 130.3987, notes: 'Ramen Hakata tonkotsu légendaire. Bouillon 18h de cuisson. Fukuoka.', difficulty: '🟢' },
        // --- Hiroshima ---
        { name: 'Okonomimura', lat: 34.3942, lng: 132.4580, notes: 'Bâtiment entier dédié à l\'okonomiyaki style Hiroshima. 24 restaurants.', difficulty: '🟢' },
        // --- Sapporo ---
        { name: 'Ramen Yokocho Sapporo', lat: 43.0568, lng: 141.3546, notes: 'Ruelle aux 17 restaurants de ramen miso. Sapporo. Hokkaido.', difficulty: '🟢' },
        { name: 'Nijo Market Sapporo', lat: 43.0626, lng: 141.3538, notes: 'Marché aux fruits de mer frais. Crabe, uni, ikura. Sapporo.', difficulty: '🟢' },
        { name: 'Genghis Khan Sapporo (Daruma)', lat: 43.0564, lng: 141.3517, notes: 'Agneau grillé sur plaque en dôme. Spécialité de Hokkaido. Sapporo.', difficulty: '🟢' },
        // --- Takayama ---
        { name: 'Marché du matin de Takayama', lat: 36.1408, lng: 137.2553, notes: 'Marché traditionnel depuis l\'ère Edo. Légumes, miso, saké. Hida.', difficulty: '🟡' },
        { name: 'Hida Beef Takayama', lat: 36.1400, lng: 137.2520, notes: 'Bœuf Hida grillé — rival du Wagyu de Kobe. Sushi de bœuf. Takayama.', difficulty: '🟡' },
        // --- Nagoya ---
        { name: 'Atsuta Horaiken (Hitsumabushi)', lat: 35.1272, lng: 136.9083, notes: 'Anguille grillée servie 3 façons. Spécialité de Nagoya. Depuis 1873.', difficulty: '🟡' },
        // --- Kagoshima ---
        { name: 'Kurobuta Tonkatsu Kagoshima', lat: 31.5889, lng: 130.5580, notes: 'Porc noir de Kagoshima — le meilleur tonkatsu du Japon. Kyushu.', difficulty: '🟡' },
        // --- Okinawa ---
        { name: 'Makishi Public Market', lat: 26.3362, lng: 127.6880, notes: 'Marché d\'Okinawa : poisson tropical, taco rice, sata andagi. Naha.', difficulty: '🟢' },
      ]
    },
    shopping: {
      label: '🛍️ Shopping & Magasins',
      places: [
        // --- Tokyo ---
        { name: 'Akihabara', lat: 35.7023, lng: 139.7745, notes: 'Quartier geek : manga, anime, figurines, retro-gaming, maid cafés. Tokyo.', difficulty: '🟢' },
        { name: 'Don Quijote Shibuya', lat: 35.6601, lng: 139.6988, notes: 'Le \"Donki\" — magasin discount dingue ouvert 24h. Tokyo.', difficulty: '🟢' },
        { name: 'Takeshita-dori (Harajuku)', lat: 35.6711, lng: 139.7027, notes: 'LA rue de la mode kawaii et street fashion. Tokyo.', difficulty: '🟢' },
        { name: 'Mandarake Nakano Broadway', lat: 35.7076, lng: 139.6654, notes: 'Temple du manga vintage et figurines rares. Tokyo.', difficulty: '🟢' },
        { name: 'Pokémon Center Mega Tokyo', lat: 35.7295, lng: 139.7186, notes: 'Plus grand Pokémon Center du Japon à Ikebukuro. Exclusivités.', difficulty: '🟢' },
        { name: 'Kappabashi-dori', lat: 35.7160, lng: 139.7908, notes: 'Rue de la vaisselle et des couteaux japonais. Répliques de nourriture. Tokyo.', difficulty: '🟡' },
        { name: 'Shimokitazawa', lat: 35.6613, lng: 139.6680, notes: 'Quartier bohème : friperies vintage, cafés indé, disquaires. Tokyo.', difficulty: '🟢' },
        { name: 'Ginza Six', lat: 35.6699, lng: 139.7632, notes: 'Centre commercial de luxe avec art contemporain. Tokyo.', difficulty: '🟢' },
        { name: 'Asakusa Nakamise-dori', lat: 35.7134, lng: 139.7966, notes: '250m de stands traditionnels vers Senso-ji. Souvenirs artisanaux. Tokyo.', difficulty: '🟢' },
        { name: 'Ameyoko Market (Ueno)', lat: 35.7101, lng: 139.7748, notes: 'Marché de rue vivant sous les rails. Vêtements, snacks, poisson. Tokyo.', difficulty: '🟢' },
        { name: 'Nintendo TOKYO Shibuya', lat: 35.6601, lng: 139.7017, notes: 'Boutique officielle Nintendo au Shibuya Parco. Exclusivités. Tokyo.', difficulty: '🟢' },
        // --- Osaka ---
        { name: 'Shinsaibashi-suji', lat: 34.6737, lng: 135.5022, notes: '600m de galerie marchande. Osaka.', difficulty: '🟢' },
        { name: 'Den Den Town (Nipponbashi)', lat: 34.6598, lng: 135.5054, notes: 'Le Akihabara d\'Osaka. Anime, manga, retro-gaming.', difficulty: '🟢' },
        { name: 'Tenjinbashi-suji', lat: 34.7063, lng: 135.5114, notes: 'Plus longue galerie marchande du Japon (2.6km !). Osaka.', difficulty: '🟢' },
        // --- Kanazawa ---
        { name: 'Marché d\'Omicho', lat: 36.5718, lng: 136.6570, notes: 'Marché aux poissons ultra-frais. Crabe, sashimi. Kanazawa.', difficulty: '🟢' },
        // --- Kyoto ---
        { name: 'Arashiyama Kimono Forest', lat: 35.0157, lng: 135.6788, notes: '600 piliers de kimono lumineux. Gratuit, magique la nuit. Kyoto.', difficulty: '🟢' },
        { name: 'Teramachi & Shinkyogoku', lat: 35.0052, lng: 135.7648, notes: 'Galeries marchandes couvertes au centre de Kyoto. Souvenirs, artisanat.', difficulty: '🟢' },
        // --- Nagoya ---
        { name: 'Osu Kannon Shopping', lat: 35.1577, lng: 136.9027, notes: 'Quartier commerçant rétro-moderne d\'Osu. Manga, friperies, street food. Nagoya.', difficulty: '🟢' },
      ]
    },
    nature: {
      label: '🌸 Nature & Paysages',
      places: [
        // --- Mont Fuji ---
        { name: 'Mont Fuji - Station 5', lat: 35.3606, lng: 138.7274, notes: '5e station accessible en bus. Ascension : juillet-août.', difficulty: '🔴' },
        { name: 'Lac Kawaguchiko', lat: 35.5118, lng: 138.7562, notes: 'Vue parfaite sur le Fuji. Onsen, musées, vélo.', difficulty: '🟢' },
        { name: 'Chureito Pagoda', lat: 35.5003, lng: 138.7980, notes: 'LA vue classique du Fuji avec pagode et cerisiers. 398 marches.', difficulty: '🟢' },
        { name: 'Lac Motosu', lat: 35.4614, lng: 138.5891, notes: 'Le lac du billet de 1000¥. Vue iconique du Fuji. Calme.', difficulty: '🟢' },
        // --- Kyoto ---
        { name: 'Arashiyama Bamboo Grove', lat: 35.0170, lng: 135.6713, notes: 'Forêt de bambous géants. Y aller tôt. Kyoto.', difficulty: '🟢' },
        { name: 'Chemin de la Philosophie', lat: 35.0217, lng: 135.7946, notes: '2km le long d\'un canal bordé de cerisiers. Kyoto.', difficulty: '🟢' },
        // --- Nagano ---
        { name: 'Jigokudani Monkey Park', lat: 36.7332, lng: 138.4629, notes: 'Macaques dans les sources chaudes. Nagano.', difficulty: '🟡' },
        { name: 'Kamikochi', lat: 36.2478, lng: 137.6329, notes: 'Vallée alpine dans les Alpes japonaises. Randonnée. Nagano.', difficulty: '🟡' },
        { name: 'Matsumoto (Château)', lat: 36.2388, lng: 137.9688, notes: 'Château noir sur fond de montagnes. Nagano.', difficulty: '🟢' },
        { name: 'Togakushi (Forêt de cèdres)', lat: 36.7557, lng: 138.0688, notes: 'Allée de cèdres géants vers le sanctuaire Okusha. Mystique. Nagano.', difficulty: '🟡' },
        // --- Hokkaido ---
        { name: 'Biei (Étang bleu)', lat: 43.4537, lng: 142.6057, notes: 'Étang bleu cobalt irréel. Fond d\'écran Apple. Hokkaido.', difficulty: '🟡' },
        { name: 'Furano (Lavande)', lat: 43.3420, lng: 142.3828, notes: 'Champs de lavande en juillet. Farm Tomita. Hokkaido.', difficulty: '🟡' },
        { name: 'Noboribetsu Jigokudani', lat: 42.4934, lng: 141.1437, notes: 'Vallée volcanique : fumerolles, eau bouillante. Hokkaido.', difficulty: '🟡' },
        { name: 'Parc national Daisetsuzan', lat: 43.6611, lng: 142.8547, notes: 'Plus grand parc national du Japon. Randonnée, ours bruns. Hokkaido.', difficulty: '🔴' },
        { name: 'Cap Kamui (Shakotan)', lat: 43.3314, lng: 140.3491, notes: 'Falaises spectaculaires et eau turquoise. Le \"Capri du Japon\". Hokkaido.', difficulty: '🟡' },
        // --- Kyushu ---
        { name: 'Gorges de Takachiho', lat: 32.7145, lng: 131.3050, notes: 'Gorges volcaniques avec cascade. Barque. Miyazaki.', difficulty: '🟡' },
        { name: 'Île de Yakushima', lat: 30.3652, lng: 130.5054, notes: 'Forêts millénaires — inspiration Princesse Mononoké. UNESCO.', difficulty: '🔴' },
        { name: 'Mont Aso (Caldeira)', lat: 32.8842, lng: 131.1041, notes: 'Plus grande caldeira du monde habité. Cratère actif fumant. Kumamoto.', difficulty: '🟡' },
        { name: 'Sakurajima', lat: 31.5850, lng: 130.6567, notes: 'Volcan actif visible depuis Kagoshima. Éruptions fréquentes. Impressionnant.', difficulty: '🟢' },
        // --- Chubu ---
        { name: 'Shirakawa-go', lat: 36.2576, lng: 136.9066, notes: 'Village aux toits de chaume. Carte postale hivernale. UNESCO. Gifu.', difficulty: '🟡' },
        { name: 'Gorges de Kurobe', lat: 36.5667, lng: 137.6613, notes: 'Barrage spectaculaire et route alpine Tateyama-Kurobe. Toyama.', difficulty: '🟡' },
        // --- Shikoku ---
        { name: 'Vallée d\'Iya', lat: 33.9498, lng: 134.0164, notes: 'Gorges et ponts de lianes. Le Japon secret. Tokushima.', difficulty: '🔴' },
        { name: 'Shimanto-gawa', lat: 32.9933, lng: 132.9340, notes: 'La \"dernière rivière claire du Japon\". Kayak et vélo. Kochi.', difficulty: '🟡' },
        // --- Nara ---
        { name: 'Parc de Nara', lat: 34.6851, lng: 135.8430, notes: 'Plus de 1000 cerfs en liberté. Shika-senbei ¥200. Nara.', difficulty: '🟢' },
        // --- Okinawa ---
        { name: 'Kerama Islands', lat: 26.1920, lng: 127.3050, notes: 'Eaux turquoises et coraux. Snorkeling avec tortues. Okinawa.', difficulty: '🟡' },
        { name: 'Cap Manzamo', lat: 26.5055, lng: 127.7715, notes: 'Falaise en forme d\'éléphant. Coucher de soleil mythique. Okinawa.', difficulty: '🟢' },
        { name: 'Île de Miyako-jima', lat: 24.7937, lng: 125.2792, notes: 'Plages paradisiaques et pont Irabu. Le \"Maldives japonais\". Okinawa.', difficulty: '🟡' },
        // --- Tohoku ---
        { name: 'Lac Towada', lat: 40.4553, lng: 140.8706, notes: 'Lac de cratère bleu profond. Automne flamboyant. Aomori.', difficulty: '🟡' },
        { name: 'Gorges d\'Oirase', lat: 40.4397, lng: 140.9531, notes: '14km de sentier le long d\'un torrent. Cascade et mousse. Aomori.', difficulty: '🟡' },
        { name: 'Zao Onsen (Monstres de neige)', lat: 38.1670, lng: 140.3972, notes: 'Arbres givrés \"juhyo\" en hiver. Paysage lunaire. Yamagata.', difficulty: '🟡' },
      ]
    },
    culture: {
      label: '🎌 Culture & Expériences',
      places: [
        // --- Tokyo ---
        { name: 'TeamLab Borderless Azabudai', lat: 35.6605, lng: 139.7310, notes: 'Art numérique immersif. Réserver en avance. Tokyo.', difficulty: '🟢' },
        { name: 'Shibuya Crossing', lat: 35.6595, lng: 139.7004, notes: 'Carrefour le plus célèbre du monde. Vue depuis Shibuya Sky. Tokyo.', difficulty: '🟢' },
        { name: 'Musée Ghibli', lat: 35.6962, lng: 139.5704, notes: 'L\'univers de Miyazaki. Réserver des mois en avance. Tokyo.', difficulty: '🟡' },
        { name: 'Roppongi Hills Mori Tower', lat: 35.6604, lng: 139.7292, notes: 'Vue 360° sur Tokyo. Sky Deck en plein air. Sunset.', difficulty: '🟢' },
        { name: 'Sumo à Ryogoku', lat: 35.6966, lng: 139.7929, notes: 'Tournoi de sumo au Kokugikan. 3 tournois/an à Tokyo.', difficulty: '🟡' },
        { name: 'Tokyo Skytree', lat: 35.7101, lng: 139.8107, notes: '634m — plus haute tour du Japon. Vue et aquarium. Tokyo.', difficulty: '🟢' },
        { name: 'Kabukicho Tower', lat: 35.6960, lng: 139.7015, notes: 'Tour de divertissement : arcade, cinéma, bars. Shinjuku.', difficulty: '🟢' },
        { name: 'Musée Edo-Tokyo', lat: 35.6967, lng: 139.7957, notes: 'Histoire de Tokyo de l\'ère Edo à aujourd\'hui. Maquettes grandeur nature.', difficulty: '🟢' },
        { name: 'Parc Ghibli (Aichi)', lat: 35.1747, lng: 137.0856, notes: 'Nouveau parc thématique Ghibli. Totoro, Mononoke, Howl. Nagakute.', difficulty: '🟢' },
        // --- Kyoto ---
        { name: 'Quartier de Gion', lat: 35.0037, lng: 135.7747, notes: 'Quartier des geishas. Maisons de thé, lanternes. Kyoto.', difficulty: '🟢' },
        { name: 'Cérémonie du thé à Kyoto', lat: 35.0094, lng: 135.7681, notes: 'Thé matcha dans une maison de thé traditionnelle. Kyoto.', difficulty: '🟢' },
        { name: 'Sagano Scenic Railway', lat: 35.0196, lng: 135.6449, notes: 'Train panoramique dans les gorges de Hozugawa. Automne. Kyoto.', difficulty: '🟢' },
        { name: 'Nuit à Gion (spectacle Maiko)', lat: 35.0042, lng: 135.7755, notes: 'Spectacle de danse de maiko dans un théâtre traditionnel. Kyoto.', difficulty: '🟡' },
        // --- Hiroshima ---
        { name: 'Mémorial de la Paix d\'Hiroshima', lat: 34.3955, lng: 132.4536, notes: 'Dôme de Genbaku et musée. Lieu de mémoire essentiel. UNESCO.', difficulty: '🟢' },
        // --- Himeji ---
        { name: 'Château de Himeji', lat: 34.8394, lng: 134.6939, notes: 'Le plus beau château du Japon — \"Héron Blanc\". UNESCO.', difficulty: '🟢' },
        // --- Osaka ---
        { name: 'Château d\'Osaka', lat: 34.6873, lng: 135.5262, notes: 'Château emblématique avec vue sur la ville. Musée. Osaka.', difficulty: '🟢' },
        { name: 'Universal Studios Japan', lat: 34.6654, lng: 135.4323, notes: 'Parc à thème avec zone Harry Potter et Super Nintendo World. Osaka.', difficulty: '🟢' },
        // --- Naoshima ---
        { name: 'Naoshima Art Island', lat: 34.4617, lng: 133.9954, notes: 'Île d\'art contemporain (citrouille Kusama). Mer de Seto.', difficulty: '🟡' },
        // --- Kanazawa ---
        { name: 'Musée 21st Century', lat: 36.5607, lng: 136.6568, notes: 'Architecture SANAA. \"Swimming Pool\" de Leandro Erlich. Kanazawa.', difficulty: '🟢' },
        { name: 'Quartier des samouraïs Nagamachi', lat: 36.5618, lng: 136.6507, notes: 'Ruelles d\'anciennes résidences de samouraïs. Kanazawa.', difficulty: '🟢' },
        // --- Nagasaki ---
        { name: 'Gunkanjima (Île du Cuirassé)', lat: 32.6278, lng: 129.7385, notes: 'Île abandonnée post-apocalyptique. Excursion en bateau. Nagasaki.', difficulty: '🟡' },
        // --- Matsuyama ---
        { name: 'Dogo Onsen', lat: 33.8518, lng: 132.7882, notes: 'Plus ancien onsen du Japon (3000 ans). Inspiration du Voyage de Chihiro. Matsuyama.', difficulty: '🟢' },
        // --- Sendai ---
        { name: 'Matsushima Bay', lat: 38.3730, lng: 141.0650, notes: 'Un des 3 plus beaux paysages du Japon. 260 îles boisées. Sendai.', difficulty: '🟢' },
      ]
    },
    hotel: {
      label: '🏨 Hébergements & Onsen',
      places: [
        { name: 'Hakone (zone onsen)', lat: 35.2327, lng: 139.1070, notes: 'Ryokan avec onsen et vue Fuji. 1h30 de Tokyo.', difficulty: '🟢' },
        { name: 'Capsule Hotel Anshin Oyado Shinjuku', lat: 35.6925, lng: 139.7047, notes: 'Expérience capsule hôtel. Propre et pas cher. Tokyo.', difficulty: '🟢' },
        { name: 'Book and Bed Tokyo Ikebukuro', lat: 35.7305, lng: 139.7110, notes: 'Dormir dans une bibliothèque ! Concept unique. Tokyo.', difficulty: '🟢' },
        { name: 'Kurokawa Onsen', lat: 33.1283, lng: 131.0991, notes: 'Village thermal dans les montagnes. Rotenburo. Kumamoto.', difficulty: '🟡' },
        { name: 'Kinosaki Onsen', lat: 35.6280, lng: 134.8110, notes: '7 bains publics. Yukata dans les rues. Hyogo.', difficulty: '🟡' },
        { name: 'Beppu Onsen', lat: 33.2846, lng: 131.4914, notes: '2e source thermale au monde. Jigoku Meguri. Oita.', difficulty: '🟡' },
        { name: 'Yufuin', lat: 33.2667, lng: 131.3697, notes: 'Station thermale avec vue Mont Yufu. Boutiques artisanales. Oita.', difficulty: '🟡' },
        { name: 'Kusatsu Onsen', lat: 36.6214, lng: 138.5955, notes: 'Un des meilleurs onsen. Yubatake (champ d\'eau chaude). Gunma.', difficulty: '🟡' },
        { name: 'Shirahama Onsen', lat: 33.6783, lng: 135.3462, notes: 'Onsen en bord de mer. Plage de sable blanc. Wakayama.', difficulty: '🟡' },
        { name: 'Jozankei Onsen', lat: 42.9683, lng: 141.1604, notes: 'Vallée thermale à 45min de Sapporo. Automne spectaculaire. Hokkaido.', difficulty: '🟡' },
        { name: 'Gero Onsen', lat: 35.8049, lng: 137.2438, notes: 'Un des 3 meilleurs onsen du Japon. Bain gratuit au bord de la rivière. Gifu.', difficulty: '🟡' },
        { name: 'Dogo Onsen Honkan', lat: 33.8518, lng: 132.7882, notes: 'Bâtiment historique de 1894. Inspiration du Voyage de Chihiro. Matsuyama.', difficulty: '🟢' },
        { name: 'Ginzan Onsen', lat: 38.5684, lng: 140.5382, notes: 'Village onsen illuminé la nuit en hiver. Ambiance féerique. Yamagata.', difficulty: '🟡' },
        { name: 'Nozawa Onsen', lat: 36.9223, lng: 138.6334, notes: 'Village onsen + station de ski. 13 bains publics gratuits. Nagano.', difficulty: '🟡' },
      ]
    },
    offbeat: {
      label: '🎪 Insolite & Hors des sentiers',
      places: [
        // --- Tokyo ---
        { name: 'Golden Gai', lat: 35.6942, lng: 139.7034, notes: '6 ruelles de micro-bars (5-8 places). Ambiance unique. Shinjuku.', difficulty: '🟢' },
        { name: 'Yanaka', lat: 35.7262, lng: 139.7678, notes: 'Quartier rétro épargné par la guerre. Chats, cimetière, nostalgie. Tokyo.', difficulty: '🟢' },
        { name: 'Odaiba', lat: 35.6254, lng: 139.7748, notes: 'Île artificielle : Gundam géant, TeamLab, onsen, plage. Tokyo.', difficulty: '🟢' },
        { name: 'Shimokitazawa Theatre', lat: 35.6608, lng: 139.6685, notes: 'Quartier alternatif : théâtres underground, cafés vintage. Tokyo.', difficulty: '🟢' },
        { name: 'Akihabara Retro Gaming', lat: 35.7018, lng: 139.7713, notes: 'Super Potato et les arcades rétro : bornes Sega, Nintendo. Tokyo.', difficulty: '🟢' },
        // --- Osaka ---
        { name: 'Spa World Osaka', lat: 34.6517, lng: 135.5063, notes: 'Onsen géant thématique : bains du monde entier. 8 étages. Osaka.', difficulty: '🟢' },
        { name: 'Tombeau de Nintoku', lat: 34.5641, lng: 135.4873, notes: 'Tombe en forme de trou de serrure géante. Vue aérienne. UNESCO. Sakai.', difficulty: '🟡' },
        // --- Tottori ---
        { name: 'Dunes de Tottori', lat: 35.5402, lng: 134.2286, notes: 'Seules dunes de sable du Japon. Chameau, parapente. Tottori.', difficulty: '🟡' },
        // --- Aomori ---
        { name: 'Festival Nebuta (Aomori)', lat: 40.8246, lng: 140.7406, notes: 'Chars lumineux géants en papier. Août. Aomori.', difficulty: '🟡' },
        // --- Tokushima ---
        { name: 'Festival Awa Odori', lat: 34.0658, lng: 134.5593, notes: 'Plus grande danse folklorique du Japon. Août. Tokushima.', difficulty: '🟡' },
        // --- Îles animales ---
        { name: 'Île de Tashirojima (Île aux chats)', lat: 38.2990, lng: 141.4217, notes: 'Chats plus nombreux que les humains. Ishinomaki.', difficulty: '🟡' },
        { name: 'Île d\'Okunoshima (Île aux lapins)', lat: 34.3119, lng: 132.9923, notes: 'Centaines de lapins en liberté. Hiroshima.', difficulty: '🟡' },
        { name: 'Zao Fox Village', lat: 38.0850, lng: 140.4360, notes: 'Village avec plus de 100 renards en liberté. Miyagi.', difficulty: '🟡' },
        // --- Wakayama ---
        { name: 'Gare de Kishi (chat stationmaster)', lat: 34.2247, lng: 135.3461, notes: 'Gare dont le chef de gare est un chat. Tama le chat. Wakayama.', difficulty: '🟡' },
        // --- Niigata ---
        { name: 'Sado Island (tambours Taiko)', lat: 38.0350, lng: 138.3687, notes: 'Île des tambours Kodo Taiko. Ancienne île d\'exil. Niigata.', difficulty: '🟡' },
        // --- Nagano ---
        { name: 'Obuse (ville de Hokusai)', lat: 36.6978, lng: 138.3141, notes: 'Petit village où Hokusai a peint ses dernières œuvres. Chestnut town. Nagano.', difficulty: '🟡' },
        // --- Shizuoka ---
        { name: 'Sumata Gorge (Dream Bridge)', lat: 35.0625, lng: 138.0190, notes: 'Pont suspendu au-dessus d\'un lac turquoise. Randonnée. Shizuoka.', difficulty: '🔴' },
      ]
    }
  },

  CAT_COLORS: {
    temple: '#e74c3c', restaurant: '#e67e22', shopping: '#9b59b6',
    nature: '#2ecc71', culture: '#3498db', hotel: '#1abc9c', offbeat: '#f39c12'
  },

  init() {
    document.getElementById('suggestions-close')?.addEventListener('click', () => this.close());
    document.getElementById('suggestions-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'suggestions-overlay') this.close();
    });

    this.renderCategories();

    // Ajouter le contrôle carte après que MapManager soit initialisé
    setTimeout(() => {
      this._addMapControl();
      if (this.showOnMap) this._addAllMarkers();
    }, 500);

    console.log('💡 Suggestions initialisé');
  },

  toggle() {
    this.isOpen = !this.isOpen;
    document.getElementById('suggestions-overlay')?.classList.toggle('active', this.isOpen);
  },

  close() {
    this.isOpen = false;
    document.getElementById('suggestions-overlay')?.classList.remove('active');
  },

  // === Contrôle sur la carte ===
  _addMapControl() {
    if (!MapManager.map) return;

    const SuggestControl = L.Control.extend({
      options: { position: 'topright' },
      onAdd: () => {
        const container = L.DomUtil.create('div', 'leaflet-bar suggest-map-control');
        container.innerHTML = `<button id="suggest-map-ctrl" class="suggest-map-ctrl-btn active" title="Afficher/masquer les suggestions">💡</button>`;
        L.DomEvent.disableClickPropagation(container);
        container.querySelector('button').addEventListener('click', () => this.toggleMapMarkers());
        return container;
      }
    });

    new SuggestControl().addTo(MapManager.map);
  },

  // === Map markers ===
  toggleMapMarkers() {
    this.showOnMap = !this.showOnMap;

    // MAJ bouton carte
    const ctrlBtn = document.getElementById('suggest-map-ctrl');
    if (ctrlBtn) ctrlBtn.classList.toggle('active', this.showOnMap);

    // MAJ bouton dans panneau suggestions
    const panelBtn = document.getElementById('suggest-map-toggle');
    if (panelBtn) {
      panelBtn.classList.toggle('active', this.showOnMap);
      panelBtn.textContent = this.showOnMap ? '🗺️ MASQUER DE LA CARTE' : '🗺️ AFFICHER SUR LA CARTE';
    }

    if (this.showOnMap) {
      this._addAllMarkers();
    } else {
      this._removeAllMarkers();
    }
  },

  _addAllMarkers() {
    this._removeAllMarkers();
    const map = MapManager.map;
    if (!map) return;

    Object.entries(this.SUGGESTIONS).forEach(([catKey, cat]) => {
      const color = this.CAT_COLORS[catKey] || '#999';
      cat.places.forEach(place => {
        const alreadyAdded = POIManager.pois.some(p =>
          Math.abs(p.lat - place.lat) < 0.001 && Math.abs(p.lng - place.lng) < 0.001
        );

        const icon = L.divIcon({
          className: 'suggest-map-marker',
          html: `<div class="suggest-marker-dot" style="background:${color};${alreadyAdded ? 'opacity:0.3;' : ''}"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });

        const marker = L.marker([place.lat, place.lng], { icon })
          .bindTooltip(`${place.name}${alreadyAdded ? ' ✅' : ''}`, {
            direction: 'top', offset: [0, -10],
            className: 'suggest-tooltip'
          });

        if (!alreadyAdded) {
          marker.on('click', () => {
            this.close();
            MapManager.centerOn(place.lat, place.lng, 14);
            POIManager.showAddModal(place.lat, place.lng, place.name, catKey);
            setTimeout(() => SearchManager.fetchAndSetPhoto(place.name), 200);
            document.getElementById('poi-notes').value = place.notes;
          });
        }

        marker.addTo(map);
        this._mapMarkers.push(marker);
      });
    });
  },

  _removeAllMarkers() {
    this._mapMarkers.forEach(m => m.remove());
    this._mapMarkers = [];
  },

  renderCategories() {
    const container = document.getElementById('suggestions-list');
    if (!container) return;

    const header = document.querySelector('.suggestions-header-actions');
    if (header && !document.getElementById('suggest-map-toggle')) {
      const btn = document.createElement('button');
      btn.id = 'suggest-map-toggle';
      btn.className = 'pixel-btn pixel-btn-tiny pixel-btn-orange suggest-map-btn active';
      btn.textContent = '🗺️ MASQUER DE LA CARTE';
      btn.addEventListener('click', () => this.toggleMapMarkers());
      header.appendChild(btn);
    }

    container.innerHTML = Object.entries(this.SUGGESTIONS).map(([catKey, cat]) => `
      <div class="suggest-category" data-cat="${catKey}">
        <button class="suggest-category-header" data-cat="${catKey}">
          <span class="suggest-category-label">${cat.label}</span>
          <span class="suggest-category-count">${cat.places.length}</span>
          <span class="suggest-category-arrow">▼</span>
        </button>
        <div class="suggest-places" id="suggest-places-${catKey}">
          ${cat.places.map((place, i) => `
            <div class="suggest-place" data-cat="${catKey}" data-index="${i}">
              <div class="suggest-thumb" data-cat="${catKey}" data-index="${i}">
                <div class="suggest-thumb-shimmer"></div>
                <img class="suggest-thumb-img" src="" alt="${place.name}">
                <span class="suggest-thumb-placeholder">📷</span>
              </div>
              <div class="suggest-place-info">
                <span class="suggest-place-name">${place.name}</span>
                <span class="suggest-place-notes">${place.notes}</span>
              </div>
              <span class="suggest-place-diff" title="Difficulté d'accès">${place.difficulty}</span>
              <button class="suggest-add-btn pixel-btn pixel-btn-tiny pixel-btn-green" data-cat="${catKey}" data-index="${i}">+ AJOUTER</button>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.suggest-category-header').forEach(header => {
      header.addEventListener('click', () => {
        const cat = header.dataset.cat;
        const places = document.getElementById(`suggest-places-${cat}`);
        const isOpening = !header.classList.contains('open');
        header.classList.toggle('open');
        places?.classList.toggle('open');
        if (isOpening) this.loadPhotosForCategory(cat);
      });
    });

    container.querySelectorAll('.suggest-add-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.addSuggestion(btn.dataset.cat, parseInt(btn.dataset.index));
      });
    });
  },

  async loadPhotosForCategory(catKey) {
    const cat = this.SUGGESTIONS[catKey];
    if (!cat) return;
    for (let i = 0; i < cat.places.length; i++) {
      const place = cat.places[i];
      const thumb = document.querySelector(`.suggest-thumb[data-cat="${catKey}"][data-index="${i}"]`);
      if (!thumb || thumb.dataset.loaded) continue;
      thumb.dataset.loaded = 'true';
      this._loadThumbPhoto(thumb, place.name);
    }
  },

  async _loadThumbPhoto(thumb, name) {
    try {
      const url = await SearchManager.searchWikipediaPhoto(name);
      const img = thumb.querySelector('.suggest-thumb-img');
      const placeholder = thumb.querySelector('.suggest-thumb-placeholder');
      const shimmer = thumb.querySelector('.suggest-thumb-shimmer');
      if (shimmer) shimmer.style.display = 'none';
      if (url && img) {
        img.src = url;
        img.onload = () => { img.classList.add('loaded'); if (placeholder) placeholder.style.display = 'none'; };
        img.onerror = () => { if (placeholder) placeholder.textContent = '🏯'; };
      } else {
        if (placeholder) placeholder.textContent = '🏯';
      }
    } catch {
      const placeholder = thumb?.querySelector('.suggest-thumb-placeholder');
      if (placeholder) placeholder.textContent = '🏯';
    }
  },

  async addSuggestion(catKey, index) {
    const place = this.SUGGESTIONS[catKey]?.places[index];
    if (!place) return;

    const exists = POIManager.pois.find(p =>
      Math.abs(p.lat - place.lat) < 0.001 && Math.abs(p.lng - place.lng) < 0.001
    );
    if (exists) {
      POIManager.showNotification(`⚠ ${place.name} est déjà dans ta liste !`, 'warning');
      POIManager.showDetailPanel(exists.id);
      return;
    }

    MapManager.centerOn(place.lat, place.lng, 14);
    this.close();
    POIManager.showAddModal(place.lat, place.lng, place.name, catKey);
    setTimeout(() => SearchManager.fetchAndSetPhoto(place.name), 200);
    document.getElementById('poi-notes').value = place.notes;
  }
};
