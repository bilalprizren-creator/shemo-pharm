# Product photo sources — 2026-09-23

How many pixels each product had in the best source file this project holds,
on its longest side. Written by `scripts/audit-photo-sources.mjs`; see its
header for why the served files cannot answer this themselves.

The detail page draws a product up to ~465 CSS px tall (≈ 930 device px on a
phone). Below 450 px a photo is soft everywhere; below 700 px on high-density
screens. A better photo can only come from outside: the supplier's packshot,
or a new photograph.

| | Products |
|---|---|
| Soft on every screen (< 450 px) | 299 |
| Soft on high-density screens (450–699 px) | 1541 |
| Sharp (≥ 700 px) | 436 |
| No packshot source (only a staged picture, or nothing) | 8 |
| No photo at all | 0 |

## Froika

The light Froika bottles read as blurry because every usable file this
project has for them is small: the Jara PNGs and the old catalogue's photos
are the same ~500 px remove.bg previews. Where the old shop's upload is
larger, it is mostly a staged picture (a plinth, a water splash, a model) with
the bottle a fraction of it — no sharper as a packshot. Checked on 2026-09-23:

- Jara, the old catalogue, the old shop and the segmented cuts — the table below.
- The Kimi image search for Jara (Downloads, master list of 9 460 articles):
  three Froika articles, none of the AC range.
- 7740 has a sharp 1 032 px photo in the Jara project, but of a newer pump
  pack than the one shown now; worth using only if that is the pack SHEMO
  delivers.

What would fix them is the manufacturer's own packshots (Froika, ≥ 1 000 px).

| Code | Product | Best px | Sources (px) |
|---|---|---|---|
| 7784 | Flamosin gel 40ml (7784) | 350 | jara 350, katalog 350 (old shop: a staged picture, not counted) |
| 7769 | AC Azelaic cream 20% 30ml (7769) | 378 | jara 378, katalog 378 (old shop: a staged picture, not counted) |
| 7788 | Suncare Anti-Spot Cream 50+ 30ml (7788) | 434 | jara 434, katalog 434, wordpress 424 |
| 7751 | W Plus Cream 200ml (7751) | 435 | jara 435, katalog 435, wordpress 434 |
| 7772 | AC Liquid cleanser face & body 200ml (7772) | 442 | jara 442, katalog 442 (old shop: a staged picture, not counted) |
| 7792 | Anti – oily dandruf ds shampoo 200ml (7792) | 447 | jara 447, katalog 447, wordpress 446 |
| 7859 | AC Tinted Cream Light 20SPF 30ml (7859) | 447 | jara 447, katalog 447, wordpress 446 |
| 7733 | AC Cream Sal Peptide 30ml (7733) | 448 | wordpress 448, jara 372, katalog 372 |
| 7801 | Hyaluronic silk touch light 50+ SPF 50ml (7801) | 451 | jara 451, katalog 451, wordpress 450 |
| 7743 | Hyaluronic C mature cream 40ml (7743) | 452 | jara 452, katalog 452 (old shop: a staged picture, not counted) |
| 7739 | U-40 Urea Emulsion Concentrate 150ml (7739) | 455 | jara 455, katalog 455, wordpress 453 |
| 7770 | Anti – pigment peptide cream 30ml (7770) | 455 | jara 455, katalog 455 (old shop: a staged picture, not counted) |
| 7783 | Anti-Oilness Shampoo 200ML (7783) | 457 | jara 457, katalog 457, wordpress 453 |
| 7742 | Hyaluronic C eye cream 15ml (7742) | 460 | jara 460, katalog 460 (old shop: a staged picture, not counted) |
| 7791 | Anti-dry dandruf shampoo 200ml (7791) | 460 | wordpress 460, jara 460, katalog 460 |
| 7754 | Scar Gel 40ml (7754) | 462 | wordpress 462, jara 389, katalog 389 |
| 7759 | Ninolin Shampo 125ml (7759) | 465 | wordpress 465, jara 465, katalog 465 |
| 7780 | AC Lotion F 200ml (7780) | 465 | wordpress 465, jara 464, katalog 464 |
| 7730 | Froiplak Homeo Fluoride Mouthrinse Apple-Cinnamon flavor 250ml (7730) | 475 | wordpress 475, jara 391, katalog 391 |
| 7818 | Froisept Mouth Wash 250ml (7818) | 476 | jara 476, katalog 476, wordpress 381 |
| 7768 | Suncare Tinted Cream 50+ SPF 50ml (7768) | 478 | wordpress 478, jara 428, katalog 428 |
| 7758 | Froipol liquid 200ml (7758) | 480 | jara 480, katalog 480 (old shop: a staged picture, not counted) |
| 7771 | Anti – pigment whitening body milk 200ml (7771) | 480 | jara 480, katalog 480 (old shop: a staged picture, not counted) |
| 7774 | Premium night drops retinoid vitamin C+E 30ml (7774) | 484 | jara 484, katalog 484 (old shop: a staged picture, not counted) |
| 7852 | W Plus Emollient Wash 200ml (7852) | 491 | wordpress 491, jara 409, katalog 409 |
| 7813 | Froiplak 0.12 Oral Rinse Anti Color Action 250ml (7813) | 494 | wordpress 494, jara 418, katalog 418 |
| 7755 | Pyrocton Shampoo Antidandruff 200ml (7755) | 500 | wordpress 500, jara 461, katalog 461 |
| 7773 | Cinolin cream 125ml (7773) | 500 | wordpress 500, jara 468, katalog 468 |
| 7800 | Hyaluronic Silk Touch Anti-Spot 50+ SPF 50ml (7800) | 500 | wordpress 500, katalog 490 |
| 7748 | Anti – pigment cream spf 50+ 30ml (7748) | 501 | jara 501, katalog 501 (old shop: a staged picture, not counted) |
| 7806 | Froiplak fluor fluoride mouthrinse 250ml (7806) | 512 | wordpress 512, jara 459, katalog 459 |
| 7766 | Froiplak Gel 40ml (7766) | 521 | wordpress 521, jara 428, katalog 428 |
| 7734 | AC AHA-10 Emulsion 125ml (7734) | 524 | wordpress 524, jara 436, katalog 436 |
| 7798 | Suncare Cream 50+ SPF 50ml Water Resistant (7798) | 531 | wordpress 531, jara 434, katalog 434 |
| 7752 | W Plus Milk 200ml (7752) | 538 | wordpress 538, jara 447, katalog 447 |
| 7761 | Climbazole Shampoo 200ml (7761) | 541 | wordpress 541, jara 477, katalog 477 |
| 7746 | Sensitive A-R Cream 40ml (7746) | 548 | wordpress 548, jara 456, katalog 456 |
| 7760 | Calamine Lotion 125ml (7760) | 548 | wordpress 548, jara 456, katalog 456 |
| 7782 | Hyaluronic Silk Touch Tinted 50+ SPF 40ml (7782) | 548 | wordpress 548, katalog 525 |
| 7815 | Froiplak Plus 0.20 Mouth Wash 250ml (7815) | 550 | jara 550, katalog 550, wordpress 448 |
| 7732 | AC Cleanser Sal-Wash Liquid 200ml (7732) | 551 | wordpress 551, jara 463, katalog 463 |
| 7731 | Froiplak Homeo Fluoride Mouthrinse Orange 250ml (7731) | 555 | jara 555, katalog 555, wordpress 483 |
| 7737 | U-10 Cream 10% 150ml (7737) | 555 | wordpress 555, jara 464, katalog 464 |
| 7750 | AC Azelaic gel 10% 30ml (7750) | 559 | jara 559, katalog 559 (old shop: a staged picture, not counted) |
| 7855 | Froiplak Homeo Flouride Mouthrinse 250ml (7855) | 570 | wordpress 570, jara 460, katalog 460 |
| 7795 | Scar gel 50+ SPF 30ml (7795) | 573 | jara 573, katalog 348 (old shop: a staged picture, not counted) |
| 7764 | Anti-Spot Aha Gel 30ml (7764) | 581 | wordpress 581, jara 441, katalog 441 |
| 7738 | U-3 Cream 3% 150ml (7738) | 590 | jara 590, katalog 590, wordpress 531 |
| 7767 | Froiplak Plus 250ml (7767) | 603 | jara 603, katalog 603, wordpress 462 |
| 7747 | Froicalm Cream with Calamine 150ml (7747) | 729 | wordpress 729, jara 421, katalog 421 |
| 7789 | Anti – hair loss peptide lotion 100ml (7789) | 739 | jara 739, wordpress 500, katalog 376 |
| 7749 | Anti – pigment serum 30ml (7749) | 791 | jara 791, katalog 472 (old shop: a staged picture, not counted) |
| 7763 | Anti-Hair Loss Peptide Shampoo 200ml (7763) | 912 | jara 912, katalog 452, wordpress 450 |
| 7740 | Hyaluronic AHA-10 Milk 125ml (7740) | 928 | jara 928, wordpress 439, katalog 381 |
| 7790 | Flamosin Cream 50ml (Froika) (7790) | 956 | wordpress 956, jara 462, katalog 462 |
| 7765 | Anti-Spot Cream With Vitamin C 30ml (7765) | 968 | jara 968, katalog 968, wordpress 233 |
| 7775 | Anti-Perspirant Spray 60ml (7775) | 1012 | wordpress 1012, jara 376, katalog 376 |
| 9491 | PS Shampoo for Scalp 200ml (9491) | 1012 | wordpress 1012, jara 591, katalog 591 |
| 7793 | AC Tinted Cream 20+ spf 30ml (7793) | 1024 | wordpress 1024, jara 567, katalog 567 |
| 9493 | PS Cream Topical for Skin 100ml (9493) | 1024 | wordpress 1024, jara 433, katalog 433 |
| 9494 | PS Body Baume 200ml (9494) | 1024 | wordpress 1024, jara 619, katalog 619 |
| 7744 | Hyaluronic C micro cream 50ml (7744) | 1036 | wordpress 1036, jara 452, katalog 452 |
| 9492 | PS Spray Body & Scalp 100ml (9492) | 1049 | wordpress 1049, jara 688, katalog 688 |
| 9495 | PS Cream Cleanser 200ml (9495) | 1049 | wordpress 1049, jara 581, katalog 581 |

## Soft on every screen (< 450 px), smallest first

| Code | Product | Best px | Sources (px) |
|---|---|---|---|
| 8452 | Jastëk për kërrbisht SL-07Y (8452) | 136 | wordpress 136, jara 135, katalog 135 |
| 5061 | Kanillë për infuzion 24g Verdhë (5061) | 194 | wordpress 194 |
| 3210B | Kukident Extra Strong Med + Kamille 40g – Ngjitës për dhëmbë (3210B) | 206 | wordpress 206 |
| 9872 | Tanflex Fort Oral Spray 30ml (9872) | 226 | wordpress 226, katalog 226 |
| 9489 | Pavloderm Soap (9489) | 238 | jara 238, katalog 238, wordpress 236 |
| 3078 | Chicco Maje per Shishe A2 6M+ (3078) | 242 | jara 242, katalog 242, wordpress 240 |
| 7662 | Oral-B Brushe 1.2.3 (7662) | 274 | jara 274, katalog 274, wordpress 273 |
| 9874 | Tanflex 0.15% Oral Spray 30ml (9874) | 275 | wordpress 275, katalog 275 |
| 1089 | Colief Infant drops 15ml (1089) | 315 | wordpress 315, katalog 315 |
| 9065 | Muconeb 6% solution 4ml A30 (9065) | 320 | katalog 320 (old shop: a staged picture, not counted) |
| 3019 | Harmony Soother 6-18Month (Bio Tree) (3019) | 324 | jara 324, katalog 324 (old shop: a staged picture, not counted) |
| 1734 | Trodon 100mg/2ml-5amp (1734) | 325 | wordpress 325, katalog 325 |
| 8051 | Qafore e butë SL-05 S, M, L, XL (8051) | 330 | jara 330, katalog 330 (old shop: a staged picture, not counted) |
| 9839 | Amva Denk 5/160mg X 28tab | 334 | katalog 334 |
| 5176 | Atrix Intensive Creme 250ml (5176) | 339 | wordpress 339, katalog 338 |
| 3018 | Harmony Soother 0-6Month (Bio Tree) (3018) | 349 | jara 349, katalog 349 (old shop: a staged picture, not counted) |
| 4523 | Dorëza Sterile 7 1/2 (4523) | 350 | wordpress 350 |
| 7784 | Flamosin gel 40ml (7784) | 350 | jara 350, katalog 350 (old shop: a staged picture, not counted) |
| 3005 | Wide Neck PP Bottle 150ml 0-6 Month (Bio Tree) (3005) | 351 | jara 351, katalog 351 (old shop: a staged picture, not counted) |
| 1093 | Procombo Sinbiotic 780mg caps A10 (1093) | 352 | wordpress 352, jara 340, katalog 340 |
| 3014 | Silicone Teat Fast Flow 18+ Month (Bio Tree) (3014) | 357 | jara 357, katalog 357 (old shop: a staged picture, not counted) |
| 8530 | Jastëk për karrige SL-06 (8530) | 357 | jara 357, katalog 357 (old shop: a staged picture, not counted) |
| 3012 | Silicone Teat Slow Flow 0-6 Month (Bio Tree) (3012) | 358 | jara 358, katalog 358 (old shop: a staged picture, not counted) |
| 4141 | Ivy Bear Men's Hair 60gummies | 358 | jara 358, katalog 358 |
| 7627 | Etodin fort 400mg x 14 tab (7627) | 360 | wordpress 360, katalog 317 |
| 9062 | Ringer lactate 500ml A20 (9062) | 362 | katalog 362 (old shop: a staged picture, not counted) |
| 1041 | Prenalact 60 capsules (1041) | 366 | jara 366, katalog 366, wordpress 364 |
| 2426 | Jake vitamin-candy raspberry A12 (2426) | 369 | wordpress 369, katalog 369 |
| 4161 | Haribo Minis 10G X 100pcs (4161) | 370 | jara 370, katalog 370, wordpress 369 |
| 4127 | Collagen Peptides Powder Green Apple 330G (4127) | 372 | wordpress 372, jara 372, katalog 372 |
| 4518 | Shiring 10ml me gjilper 21G-A100 (4518) | 373 | jara 373, katalog 373, wordpress 343 |
| 9662 | Olilgogal SE caps (9662) | 373 | katalog 373, wordpress 372 |
| 3013 | Silicone Teat Medium Flow 6-18 Month (Bio Tree) (3013) | 374 | jara 374, katalog 374 (old shop: a staged picture, not counted) |
| 8025 | Qafore e butë e zezë SL-05D – S, M, L (8025) | 375 | jara 375, katalog 375 (old shop: a staged picture, not counted) |
| 2070A | Vaseline Body Aloe Soothe Body Lotion 400ml (2070A) | 377 | jara 377, katalog 377, wordpress 376 |
| 4696 | Soda Ingiliz Karbonati 5X20 100gr (4969) | 377 | wordpress 377 |
| 7769 | AC Azelaic cream 20% 30ml (7769) | 378 | jara 378, katalog 378 (old shop: a staged picture, not counted) |
| 9483 | Pavloderm Powder 90gr (9483) | 378 | jara 378, katalog 378, wordpress 377 |
| 1044 | Prenatal 60 capsule (1044) | 379 | jara 379, katalog 379, wordpress 377 |
| 4107 | Reapir + rosemary hair conditioner 200ml | 381 | jara 381, katalog 381 |
| 0197 | Colour restoring cream 250ml (0197) | 384 | katalog 384 (old shop: a staged picture, not counted) |
| 1243 | Anaketon 12 bustine (1243) | 386 | jara 386, katalog 386, wordpress 384 |
| 3028 | Cuddly Straw Cup 300ml 6+ Month (Bio Tree) (3028) | 386 | jara 386, katalog 386 (old shop: a staged picture, not counted) |
| 1006 | Neurocomplex B 30tablets (1006) | 387 | wordpress 387, jara 387, katalog 387 |
| 4662 | Always Ultra Super A8 (2) (4662) | 387 | jara 387, katalog 387 (old shop: a staged picture, not counted) |
| 3004 | Anti-Colic PP Bottle 240ml 0-6 Month (Bio Tree) (3004) | 388 | jara 388, katalog 388 (old shop: a staged picture, not counted) |
| 5006 | Always Platinum Super A7 (5006) | 388 | jara 388, katalog 388 (old shop: a staged picture, not counted) |
| 1007 | Alpherol vitamin E 400IU 30 softgel (1007) | 389 | wordpress 389, jara 389, katalog 389 |
| 7344 | Tampon Peach Young A4 (7344) | 389 | jara 389, katalog 314, wordpress 270 |
| 3080 | Chicco Mema Mashtruese per Djem A2 6-16M (3080) | 390 | jara 390, katalog 390, wordpress 386 |
| 1053 | Omega 3 1000mg 60softgels (1053) | 391 | jara 391, katalog 391, wordpress 389 |
| 7513 | Septolis spray for throat 30ml (7513) | 391 | jara 391, katalog 391 (old shop: a staged picture, not counted) |
| 8981 | Althaea Syrups 1+ 150ml (LEDAPHARMA) (8981) | 391 | jara 391, katalog 391, wordpress 389 |
| 2054 | Labella Lip Balm Origjinal + Vit E 4.8G A3 (Curalene) (2054) | 393 | jara 393, katalog 393 (old shop: a staged picture, not counted) |
| 4527 | Dorëza Sterile 8.5 (4527) | 393 | wordpress 393 |
| 8985 | Primula Syrup 1+ 150ml (LEDAPHARMA) (8985) | 393 | wordpress 393, jara 393, katalog 393 |
| 3000 | Manual Breast Pump (Bio Tree) (3000) | 394 | jara 394, katalog 394 (old shop: a staged picture, not counted) |
| 3024 | Fruit Feeder 6+Months (Bio Tree) (3024) | 394 | jara 394, katalog 394 (old shop: a staged picture, not counted) |
| 4313 | Clean Ped Underpad 60X90cm 30pcs – Shtroje shtrati një përdorimëshe (4313) | 394 | wordpress 394, jara 394, katalog 394 |
| 4981 | Key Lubricant Jelly 42GR (4981) | 394 | katalog 394, wordpress 393 |
| 3129 | Baby cream 50ml (3129) | 395 | jara 395, katalog 395 (old shop: a staged picture, not counted) |
| 1005 | Magnesium +B6 x 60caps (1005) | 396 | jara 396, katalog 396, wordpress 394 |
| 2836 | Baby vaj johnsons aloe vera 500ml (2836) | 398 | wordpress 398 |
| 2419 | Jake vitamin-candy apple & cinnamon (2419) | 399 | katalog 399, wordpress 398 |
| 3026 | Dreamy Non-Spill Trainer Cup 125ml 6+ Month (Bio Tree) (3026) | 399 | jara 399, katalog 399 (old shop: a staged picture, not counted) |
| 3030 | Silicone Teether (Bio Tree) (3030) | 399 | jara 399, katalog 399 (old shop: a staged picture, not counted) |
| 5031 | Orbit peppermint A30 (5031) | 399 | jara 399, katalog 399 (old shop: a staged picture, not counted) |
| 5455 | Neceniol 800 20sachets (5455) | 399 | jara 399, katalog 399, wordpress 398 |
| 4108 | 4 Joint 15 stick sachets (4108) | 400 | katalog 400, wordpress 386 |
| 5001 | Always Platinum Night A6 (5001) | 400 | jara 400, katalog 400 (old shop: a staged picture, not counted) |
| 5025 | Orbit spearmint A30 (5025) | 400 | jara 400, katalog 400 (old shop: a staged picture, not counted) |
| 9227 | Aronia juice 250ml (9227) | 400 | wordpress 400, jara 400, katalog 400 |
| 1058 | Osteofit CA-MG-ZN-D3-K2- 60capsules (1058) | 402 | wordpress 402, jara 402, katalog 402 |
| 1140 | Fllaster A30X10 NO:111 (1140) | 402 | wordpress 402, jara 400, katalog 400 |
| 5094 | Always Ultra Super A16 (5094) | 402 | jara 402, katalog 402 (old shop: a staged picture, not counted) |
| 9668 | MELA IS 50ml (9668) | 402 | wordpress 402, katalog 401 |
| 3025 | Feeding Spoon with Silicone 6+ Month 2Pcs (Bio Tree) (3025) | 403 | jara 403, katalog 403 (old shop: a staged picture, not counted) |
| 3008 | Wide Neck PP Bottle with Grip 150ml 6+Months (Bio Tree) (3008) | 404 | jara 404, katalog 404 (old shop: a staged picture, not counted) |
| 3084 | Chicco Mema Mashtruese Soft A1 16-36M (3084) | 404 | wordpress 404, jara 404, katalog 404 |
| 5007 | Orbit eucalyptus A30 (5007) | 404 | jara 404, katalog 404 (old shop: a staged picture, not counted) |
| 7614 | Herbal lollipops for kids A10 (7614) | 404 | wordpress 404, jara 404, katalog 404 |
| 9059 | Sodium Chloride 0.9% 100ml (DEMO S.A.) (9059) | 404 | katalog 404 (old shop: a staged picture, not counted) |
| 2017 | Hand & Nagelcreme 100 ml (2017) | 405 | jara 405, katalog 405 (old shop: a staged picture, not counted) |
| 5005 | Orbit bubblemint A30 (5005) | 405 | jara 405, katalog 405, wordpress 323 |
| 9889 | Citoles 20MG X 28 tab (9889) | 405 | katalog 405, wordpress 402 |
| 2861 | Cleanose-Nose Kids Cleaning Kit 2 Syrings +10 Saline ( MILKWAY ) (2861) | 406 | wordpress 406, katalog 406 |
| 3130 | Baby cream 100ml (3130) | 406 | jara 406, katalog 406 (old shop: a staged picture, not counted) |
| 7438 | Pincetë profesionale (7438) | 406 | wordpress 406, jara 397, katalog 397 |
| 8980 | Imun Max A20 EFF (8980) | 406 | wordpress 406, jara 368, katalog 368 |
| NT-021 | Lekure 36-40 | 406 | jara 406, katalog 406 |
| NT021 | Kllompe ortopedike – Lëkurë ( NT-021 ) | 406 | wordpress 406 |
| 1228 | Neo stabyl 30compresse (1228) | 407 | jara 407, katalog 407, wordpress 357 |
| 4316L | Pampers për të rritur (L) 110-150cm A30 (4316L) | 407 | jara 407, katalog 407 (old shop: a staged picture, not counted) |
| 5003 | Orbit strawberry A30 (5003) | 408 | jara 408, katalog 408 (old shop: a staged picture, not counted) |
| 7152 | Magnesium 375 + vitamin B6 + B2 20eff (7152) | 409 | jara 409, katalog 409 (old shop: a staged picture, not counted) |
| 3100 | Stitch Brush me Vibrim Soft 4+ (3100) | 410 | wordpress 410, katalog 410 |
| 5258 | Pampers premium care (1) 2-5kg A50 (5258) | 410 | jara 410, katalog 410 (old shop: a staged picture, not counted) |
| NT-023 | Kllompe ortopedike – Lëkurë ( NT-023 ) | 410 | wordpress 410, jara 409, katalog 409 |
| 4177 | Substoff 1200stuck (4177) | 411 | jara 411, wordpress 410 |
| NT019 | Kllompe ortopedike – Lëkurë ( NT-019 ) | 411 | wordpress 411 |
| 0257 | Qese te vogla per barnatore A/1000 | 412 | jara 412, katalog 412 |
| 5079 | Pampers Premium Care (0) 3kg A30 (5079) | 412 | jara 412, katalog 412 (old shop: a staged picture, not counted) |
| 8915 | Magnezi + Vit B6 30 tableta (8915) | 412 | jara 412, katalog 412 (old shop: a staged picture, not counted) |
| 9481 | Prota Forte Iron Gluconate 17mg (9481) | 412 | jara 412, katalog 412, wordpress 332 |
| 9650 | Stevia 40 sticks ( Borchers ) (9650) | 412 | jara 412, katalog 412, wordpress 319 |
| 5221 | Ravivo 500mg X 7tablets (5221) | 413 | katalog 413, wordpress 411 |
| 7419 | Progen Plactive 30 Sachets (7419) | 413 | wordpress 413, jara 389, katalog 389 |
| NT-019 | Lekure 36-46 | 413 | jara 413, katalog 413 |
| 0389SL | Shtrenguese per kyqin e kembes e kafte (0389) S/L | 415 | wordpress 415 |
| 1193 | Fllaster për ethe herpes A10 NO: 220 (1193) | 415 | wordpress 415, jara 404, katalog 404 |
| 4661 | Always Ultra Night A7 (3) (4661) | 415 | wordpress 415, jara 363, katalog 363 |
| 8823 | Karrige me rrota DM 809 / AS809-46 (8823) | 415 | jara 415, katalog 415 (old shop: a staged picture, not counted) |
| 0439 | Splint per kyqin e dores me rrip Art.8512 S,L (0439) | 416 | katalog 416, wordpress 415 |
| 0471 | Shtrengues per kyqin e kembes e zeze Art. 7010 S,L (0471) | 416 | jara 416, katalog 416, wordpress 415 |
| 4064 | Castor Oil – Vaj Ricini me mollë 50ml (4064) | 416 | jara 416, katalog 416, wordpress 315 |
| 1059 | Reumil plus 20compresse (1059) | 417 | jara 417, katalog 417, wordpress 415 |
| 1242 | Anaketon flaconet 30ml (1242) | 417 | jara 417, katalog 417, wordpress 415 |
| 7001 | Prerëse për thonjë (7001) | 417 | jara 417, katalog 417, wordpress 319 |
| NT-029 | Kllompe ortopedike – Lekure ( NT-029 ) | 417 | wordpress 417, jara 417, katalog 417 |
| 5052 | 48-Krem per duar 50ml (5052) | 418 | jara 418, katalog 418, wordpress 417 |
| 5239 | Marvel spider-man gift set 3+ (5239) | 418 | jara 418, katalog 418, wordpress 415 |
| 8801 | Patarica nën Sjetull S, M, L (8801) | 418 | jara 418, katalog 418, wordpress 360 |
| 1249 | Tonimer isotonic baby 300mosm/kg 30 dose vials (1249) | 419 | jara 419, katalog 419, wordpress 361 |
| 2061 | Babaria Onion Mask 400ml (2061) | 419 | jara 419, katalog 419, wordpress 297 |
| 6006 | Tampon shpuze me lidhëse për vesh (6006) | 419 | jara 419, katalog 419, wordpress 293 |
| 0446 | Splint per gisht te madh te dores me shufra metali Art. 8552 S,M,L,XL (0446) | 420 | wordpress 420, jara 420, katalog 420 |
| 2064 | Labella Chupa-Chups A2 (2064) | 420 | wordpress 420, jara 419, katalog 419 |
| 1478 | Insetto repellente tropical 100ml (1478) | 421 | jara 421, katalog 421 (old shop: a staged picture, not counted) |
| 1057 | Omega C 500 60tablets (1057) | 422 | jara 422, katalog 422, wordpress 393 |
| 4319 | Selikon mbrojtës për thembër 1 palë (4319) | 422 | wordpress 422, jara 395, katalog 395 |
| 4676 | Carefree normal frischeduft A56 (4676) | 422 | wordpress 422, jara 421, katalog 421 |
| 5077 | Pampers Active Baby (6) 13-18kg A52 (5077) | 422 | wordpress 422, jara 421, katalog 421 |
| 2815 | Vaj Bademi 30ml (2815) | 423 | jara 423, katalog 423 (old shop: a staged picture, not counted) |
| 4172 | Restorative acne face serum 15ml | 423 | jara 423, katalog 423 |
| 4514 | Pavlovic Original mast 100ml (4514) | 423 | jara 423, katalog 423, wordpress 341 |
| 7637 | Pantap 40mg X 14tab ( Nobel ) (7637) | 423 | katalog 423, wordpress 422 |
| NT-008 | Kllompe ortopedike – Lëkurë ( NT-008 ) | 423 | jara 423, katalog 423, wordpress 422 |
| 0344 | Rripa fleksibil per drejtimin e shpatullave / Art.2016 S,M,L,XL,XXL (0344) | 424 | wordpress 424, jara 423, katalog 423 |
| 1239 | Vidermina clx 10 vaginal ovules (1239) | 424 | wordpress 424, jara 424, katalog 424 |
| 1665 | Vaseline Original 50ml (1665) | 424 | jara 424, katalog 424, wordpress 296 |
| 4738. | O.B Original Normal 16 tampons (4738) | 424 | wordpress 424 |
| 5112 | Losion kunder mushkonjave family care 100ml (5112) (AUTAN) | 424 | wordpress 424, jara 423, katalog 423 |
| 7710 | Listerine Mentol 80ml (7710) | 424 | jara 424, katalog 424, wordpress 270 |
| 8529 | Jastëk për hemoroide SL-07 (8529) | 424 | jara 424, katalog 424 (old shop: a staged picture, not counted) |
| 9486 | Pavloderm 150ml (9486) | 424 | jara 424, katalog 424, wordpress 381 |
| 2758 | Ekstrakt dudi fruta mali 100ml (2758) | 425 | jara 425, katalog 425 (old shop: a staged picture, not counted) |
| 0337 | Qafore e bute cervikale Art.1001 S,M,L (0337) | 426 | wordpress 426, jara 425, katalog 425 |
| 2070C | Vaseline Advanced Repair Body Lotion 400ml (2070C) | 426 | wordpress 426, jara 414, katalog 414 |
| 5073 | Pampers Active Baby (3) 6-10kg A82 (5073) | 426 | jara 426, katalog 426 (old shop: a staged picture, not counted) |
| 7615 | Herbal lollipops for kids A50 (7615) | 426 | wordpress 426, jara 426, katalog 426 |
| 8700 | Mobilizues per Nyje te Kembes me Jastek Sfungjeri (8700) | 426 | wordpress 426, jara 425, katalog 425 |
| 9480 | Prota Vitamin K2 100mcg (9480) | 426 | jara 426, katalog 426, wordpress 313 |
| 2757 | Ekstrakt dudi fruta mali 50ml (2757) | 427 | jara 427, katalog 427 (old shop: a staged picture, not counted) |
| 2002 | Balsam kali 250ml (2002) | 428 | jara 428, katalog 428 (old shop: a staged picture, not counted) |
| 4693 | Labella L.O.L (4693) | 428 | wordpress 428 |
| 7272 | Gell masazhi 250ml (7272) | 428 | jara 428, katalog 428, wordpress 424 |
| 0401 | Gjilpëra për insulinë INSUPEN 8mm (0401) | 429 | jara 429, katalog 429, wordpress 428 |
| 1231 | Ravivo 500mg/100ml I.V 100ml (1231) | 429 | katalog 429, wordpress 366 |
| 5088 | Sprej kunder mushkonjave 100ml (5088) (AUTAN) | 429 | jara 429, katalog 429, wordpress 389 |
| 5235 | Levoximed 500mg/100ml I.V. (5235) | 429 | katalog 429, wordpress 402 |
| 9479 | Prota-Mag (Magnesium Gluconate) 200mg (9479) | 429 | jara 429, katalog 429, wordpress 270 |
| 1060 | Reumil A.D 30stick (1060) | 430 | jara 430, katalog 430, wordpress 387 |
| 9739 | OPERIL-P 0.25 MG/ML Nasal spray 10ml 2-7 years (9739) | 430 | jara 430, katalog 430 (old shop: a staged picture, not counted) |
| NT-012 | Kllompe ortopedike – Lëkurë ( NT-012 ) | 430 | wordpress 430, jara 429, katalog 429 |
| 0169 | Cranflo Cranberry Extract 250mg 30 capsules (0169) | 431 | katalog 431 (old shop: a staged picture, not counted) |
| 1227 | Oledro hot 12sachets (1227) | 431 | katalog 431, wordpress 430 |
| 5186 | Nivea Intimo Natural 250ml (5186) | 431 | jara 431, katalog 431 (old shop: a staged picture, not counted) |
| 6021 | Crannos 12 stick pack (6021) | 431 | jara 431, katalog 431 (old shop: a staged picture, not counted) |
| 0373 | Shoke elastike abdominal Art.4042 (M,L) (0373) | 432 | jara 432, katalog 432, wordpress 430 |
| 2001 | Balsam kali 500 ml (2001) | 432 | jara 432, katalog 322 (old shop: a staged picture, not counted) |
| 2330 | Foot Cream – Krem për këmbë 50ml (2330) | 432 | jara 432, katalog 432, wordpress 284 |
| 2846 | Fawar Lemon 6 Sachets – Forcim i sistemit imunitar (2846) | 432 | wordpress 432, jara 407, katalog 407 |
| 3029 | Silicone Nasal Aspirator (Bio Tree) (3029) | 432 | jara 432, katalog 432 (old shop: a staged picture, not counted) |
| 3202-A | Odol – med3 original (3202-A) | 432 | wordpress 432 |
| 8803, 8804 | Gomë për patarica hiri dhe e zeze (8803,8804) | 432 | wordpress 432 |
| 0348 | Mbajtese elastike per qendrimin e drejte te shpatullave Art.2013 M,L,XS,S (0348) | 433 | jara 433, katalog 433, wordpress 432 |
| 0405 | Splint per dore dhe gisht te madh Art.8556 L,XL (0405) | 433 | katalog 433, wordpress 432 |
| 1485 | Sudocrem 60g (1485) | 433 | katalog 433, jara 338, wordpress 241 |
| 2014 | Vaseline mit ringelblumen 100 ml (2014) | 433 | jara 433, katalog 433 (old shop: a staged picture, not counted) |
| 4531 | Shiring 20ml me gjilper 21G-A50 (4531) | 433 | jara 433, katalog 433, wordpress 432 |
| 5018 | Palloma Sensitive A52 (5018) | 433 | jara 433, katalog 433, wordpress 372 |
| 7224 | Neurobex 30compresse (7224) | 433 | jara 433, katalog 433, wordpress 400 |
| 7447 | Aceton 125ml (7447) | 433 | jara 433, katalog 433, wordpress 402 |
| 0372 | Shoke universale Art.4011 M,L,2XL,XL (0372) | 434 | wordpress 434, katalog 434 |
| 2090 | Fllaster klasik NO:001 (2090) | 434 | wordpress 434, katalog 429 |
| 5014 | Kateter silikoni nr.16 (5014) | 434 | wordpress 434 |
| 5015 | Kateter silikoni nr.18 (5015) | 434 | wordpress 434 |
| 5017 | Kateter silikoni nr.20 (5017) | 434 | wordpress 434 |
| 5277 | Dextrose 10% – glucose A20 (5277) | 434 | wordpress 434, katalog 434 |
| 7788 | Suncare Anti-Spot Cream 50+ 30ml (7788) | 434 | jara 434, katalog 434, wordpress 424 |
| 8004 | Qafore Cervical Collar Sl-05U – S (8004) | 434 | katalog 434 (old shop: a staged picture, not counted) |
| 8802 | Patarica Brryli AS923L (8802) | 434 | wordpress 434, jara 390, katalog 390 |
| 0126 | Glucofactor (ekstrakt hudhre ul nivelet e sheqerit ne gjake) 30 tablets | 435 | jara 435, katalog 435 |
| 4512 | Jomelop-E 145ml (4512) | 435 | jara 435, katalog 435 (old shop: a staged picture, not counted) |
| 5305 | Ovacep powder lemon flavour 30sachets 150g | 435 | jara 435, katalog 435 |
| 7751 | W Plus Cream 200ml (7751) | 435 | jara 435, katalog 435, wordpress 434 |
| 8851 | Deltivin D3 35.000 IU/ 15 capsules (8851) | 435 | jara 435, katalog 435, wordpress 354 |
| 1706 | Propolis drops 20% 15ml (1706) | 436 | jara 436, katalog 436 (old shop: a staged picture, not counted) |
| 7110 | B – Complex forte 70g (7110) | 436 | jara 436, katalog 436, wordpress 420 |
| 7511 | Prota Ginkgo Biloba Drops 30ml (7511) | 436 | jara 436, katalog 436 (old shop: a staged picture, not counted) |
| 2035 | Krem herbal me ekstrakte arnike 100ml (2035) | 437 | jara 437, katalog 437 (old shop: a staged picture, not counted) |
| 8846 | Karrige me rrota & fecesi DM-680 (8846) | 437 | wordpress 437, jara 436, katalog 436 |
| 8848 | Inulinobiotic 4+ 30 capsules (8848) | 437 | jara 437, katalog 437, wordpress 335 |
| 9742 | OPERIL 0.5 MG/ML Nasal Drops 10ml Adults&Children 7+years (9742) | 437 | jara 437, katalog 437 (old shop: a staged picture, not counted) |
| 2230 | Penaten krem 50ml (2230) | 438 | jara 438, katalog 438, wordpress 417 |
| 5456 | Brushe interdental A18 (Setablu) | 438 | jara 438, katalog 438 |
| 7482 | Vitamin C 1000mg 30 capsula (7482) | 438 | jara 438, katalog 438 (old shop: a staged picture, not counted) |
| 1009 | Lacto defence plus 10stick (1009) | 439 | wordpress 439, jara 439, katalog 439 |
| 1050 | Hydra min 20stick (1050) | 439 | wordpress 439, jara 439, katalog 439 |
| 1054 | Omega 3-6-9 1300mg 60softgels (1054) | 439 | jara 439, katalog 439, wordpress 386 |
| 1056 | Vitamin C 1000 60tablets (1056) | 439 | jara 439, katalog 439, wordpress 404 |
| 5232 | Bioscalin energy shampoo 200ml (5232) | 439 | wordpress 439, jara 438 |
| 5232 | Tropimil 5mg/ml tropicamide 5ml (5232) | 439 | wordpress 439, jara 438 |
| 8283 | Biotin 10.000 mcg A30 (5283) | 439 | wordpress 439 |
| 0347 | Mbajtese elastike per drejtimin e shtylles kurrizore Art.2011 S,M,L,XL,XXL (0347) | 440 | jara 440, katalog 440, wordpress 439 |
| 2306 | Sun protection cream 30 spf 150ml (2306) | 440 | jara 440, katalog 440 (old shop: a staged picture, not counted) |
| 2772 | Wart Remover Liquid Solution 20ml (NT41- Solutions) (2772) | 440 | jara 440, katalog 440 (old shop: a staged picture, not counted) |
| 5243 | Brushe me kapak – hot wheels soft (5243) | 440 | katalog 440, wordpress 439 |
| 7291 | Diclonac duo 75mg 2X10 capsules (7291) | 440 | katalog 440, wordpress 389 |
| 7527 | Kids shampoo strength drops 500ml (7527) | 440 | jara 440, katalog 440, wordpress 350 |
| 8610 | Qarshaf rezistent ndaj lageshtise A1 (8610) | 440 | jara 440, katalog 440 (old shop: a staged picture, not counted) |
| 1215 | Etotac sr 600mg X 10tablets (1215) | 441 | wordpress 441, katalog 441 |
| 1233 | Istamex syrup 100ml (1233) | 441 | katalog 441, wordpress 415 |
| 1250 | Neoviderm emulision 100ml (1250) | 441 | wordpress 441, jara 440, katalog 440 |
| 3101 | Stitch Set me Qante Soft 3+ (3101) | 441 | jara 441, katalog 441, wordpress 402 |
| 5240 | Disney princess gift set (5240) | 441 | jara 441, katalog 441, wordpress 439 |
| 5241 | Hot wheels gift set 3+ (5241) | 441 | jara 441, katalog 441, wordpress 439 |
| 7103 | Magnestick Premium 400mg sticks (7103) | 441 | jara 441, katalog 441, wordpress 307 |
| 7787 | Pantogrin Plus Lotion 100 ML (7787) | 441 | wordpress 441, jara 440, katalog 440 |
| 9828 | Oligovit Mg direct B1,B6,K2,D3, 14 kesica (9828) | 441 | katalog 441 (old shop: a staged picture, not counted) |
| 0319 | Shirit per kyq te dores me ngjites (0319) | 442 | jara 442, katalog 442, wordpress 441 |
| 0329 | Splint per kyq te kembes me ngjites (0329) | 442 | jara 442, katalog 442, wordpress 441 |
| 0400 | Gjilpëra për insulinë INSUPEN 4mm (0400) | 442 | jara 442, katalog 442, wordpress 441 |
| 1045 | Xiloial pika 10ml (1045) | 442 | jara 442, katalog 442, wordpress 402 |
| 1240 | Kidilact drops 6ml (1240) | 442 | jara 442, katalog 442, wordpress 411 |
| 1532 | Bimunal imuno syrup 300ml (1532) | 442 | jara 442, katalog 442 (old shop: a staged picture, not counted) |
| 5081 | Pampers Premium Care (2) 4-8kg A23 (5081) | 442 | jara 442, katalog 218 (old shop: a staged picture, not counted) |
| 7772 | AC Liquid cleanser face & body 200ml (7772) | 442 | jara 442, katalog 442 (old shop: a staged picture, not counted) |
| 9064 | Glucosi Infundible 10% 500ml A10 (9064) | 442 | katalog 442 (old shop: a staged picture, not counted) |
| 9862 | Fitobalm Lipogel 50ml (9862) | 442 | jara 442, katalog 442, wordpress 400 |
| 0443 | Bocë oksigjeni 5 litër (0443) | 443 | jara 443, katalog 443, wordpress 358 |
| 1553 | Cardiol forte 90 minicapsule (1553) | 443 | jara 443, katalog 443 (old shop: a staged picture, not counted) |
| 2089 | Vaseline 100 ml (2089) | 443 | jara 443, katalog 443 (old shop: a staged picture, not counted) |
| 2844 | Black Mulberry Syrup 40gr – Shurup dudi (2844) | 443 | wordpress 443, jara 412, katalog 412 |
| 7242 | Bonbona kids eucalyptus & menthol A12 (7242) | 443 | jara 443, katalog 443 (old shop: a staged picture, not counted) |
| 7407 | Omegana 1000mg Omega-6 30 softgel capsules (7407) | 443 | jara 443, katalog 443 (old shop: a staged picture, not counted) |
| 9876 | Barca SR 600mg X 10tab (9876) | 443 | wordpress 443, katalog 436 |
| 0340 | Gjilpëra sterile – LANCETS ACCU-CHECK 28G A100 (0340) | 444 | jara 444, katalog 444 (old shop: a staged picture, not counted) |
| 1004 | Pmag 2.0 20bustine X 5G (1004) | 444 | jara 444, katalog 444, wordpress 443 |
| 1038 | Urix 14 stivk (1038) | 444 | jara 444, katalog 444, wordpress 443 |
| 2048 | Bepanthen Ointment Provitamin B5 30g (2048) | 444 | jara 444, katalog 444, wordpress 443 |
| 4098 | Beauty Gummy Collagen Strawberry 60 Gummies (4098) | 444 | jara 444, katalog 444 (old shop: a staged picture, not counted) |
| 5089 | Sprej kunder mushkonjave tropical 100ml (5089) (AUTAN) | 444 | jara 444, katalog 444, wordpress 336 |
| 5174 | Dhjam guse 100ml (5174) | 444 | jara 444, katalog 444 (old shop: a staged picture, not counted) |
| 5284 | Biotin 5.000 mcg A30 (5284) | 444 | jara 444, katalog 444, wordpress 443 |
| 7126 | Parfum fullmoon O2 30ml (7126) | 444 | jara 444, katalog 444, wordpress 443 |
| 7241 | Bonbona kids honey/mjaltë A12 (7241) | 444 | jara 444, katalog 444 (old shop: a staged picture, not counted) |
| 8353 | Shtrojëse thembre për këpucë (SL-501) – S(35-38), M(38-41), L(42-44) (8353) | 444 | jara 444, katalog 444 (old shop: a staged picture, not counted) |
| 1061 | Energym 10flaconi (1061) | 445 | jara 445, katalog 445, wordpress 406 |
| 2030 | Anti-Cellulite Gel 250 ml (2030) | 445 | jara 445, katalog 445 (old shop: a staged picture, not counted) |
| 2315 | Losion mbas pickimit 100ml (2315) | 445 | jara 445, katalog 445 (old shop: a staged picture, not counted) |
| 2751 | Balance solution 20ml (2751) | 445 | jara 445, katalog 445, wordpress 387 |
| 5135 | Ginseng Chocolate 48H Gold Man 16gr (5135) | 445 | jara 445, katalog 445, wordpress 289 |
| 7145 | Stress Relief 30 kapsula (7145) | 445 | jara 445, katalog 445, wordpress 411 |
| 8011 | Gota fecesi 15ml SHEMO (8011) | 445 | jara 445, katalog 445, wordpress 272 |
| 9881 | Vasoserc Bid 24mg X 30 tab (9881) | 445 | katalog 445, wordpress 411 |
| 9896 | Rightest test per glucometer GS550 (9896) | 445 | jara 445, katalog 445, wordpress 377 |
| 2820 | Johnson’s Baby Powder 200g (2820) | 446 | jara 446, katalog 446 (old shop: a staged picture, not counted) |
| 3027 | Dreamy Non-Spill Trainer Cup 250ml 6+ Months (Bio Tree) (3027) | 446 | jara 446, katalog 446 (old shop: a staged picture, not counted) |
| 4692 | Labella Batman (4692) | 446 | wordpress 446 |
| 4694 | Labella Spiderman (4694) | 446 | wordpress 446 |
| 7123 | Parfum pink stone 30ml (7123) | 446 | wordpress 446, jara 446, katalog 446 |
| 9630 | Meloo Sir 175ml (9630) | 446 | jara 446, katalog 446, wordpress 225 |
| 4800 | Glysolid 100ml (4800) | 447 | jara 447, katalog 447 (old shop: a staged picture, not counted) |
| 5011 | Gotë Urinare (5011) | 447 | jara 447, katalog 447, wordpress 243 |
| 7127 | Parfum fusion flowers 50ml (7127) | 447 | jara 447, katalog 447, wordpress 446 |
| 7185 | Multivitamin 20eff – heilusan (7185) | 447 | jara 447, katalog 447, wordpress 446 |
| 7792 | Anti – oily dandruf ds shampoo 200ml (7792) | 447 | jara 447, katalog 447, wordpress 446 |
| 7859 | AC Tinted Cream Light 20SPF 30ml (7859) | 447 | jara 447, katalog 447, wordpress 446 |
| 0483 | Dolphi Ribbed A3 (0483) | 448 | jara 448, katalog 448, wordpress 415 |
| 2900 | Fusscreme 100 ml (2900) | 448 | jara 448, katalog 448 (old shop: a staged picture, not counted) |
| 4173 | Restorative acne face cream 30ml | 448 | jara 448, katalog 448 |
| 4663 | Always Ultra Normal A10 (4663) | 448 | jara 448, katalog 448 (old shop: a staged picture, not counted) |
| 5060 | Kanillë për infuzion 22g Kaltërt (5060) | 448 | wordpress 448 |
| 5226 | Tasectan 500mg X 15capsules (5226) | 448 | jara 448, katalog 448, wordpress 387 |
| 5233 | Solprene neomicina 5ml (5233) | 448 | wordpress 448, katalog 447 |
| 7733 | AC Cream Sal Peptide 30ml (7733) | 448 | wordpress 448, jara 372, katalog 372 |
| 8506 | Silikon për harkun e shputës (SL-512) – S(34-36), M(36-38), L(38-41), XL(41-44) (8506) | 448 | jara 448, katalog 448 (old shop: a staged picture, not counted) |
| 8600 | Jastëk me nivel SL-22 S, L (8600) | 448 | wordpress 448 |
| 8833 | Plusspan 100ml (8833) | 448 | jara 448, katalog 448 (old shop: a staged picture, not counted) |
| 9740 | OPERIL-P 0.25 MG/ML nasal drops 10ml 2-7 years (9740) | 448 | jara 448, katalog 448 (old shop: a staged picture, not counted) |
| 9868 | Genestin Intimate Cream 30ml (9868) | 448 | jara 448, katalog 448, wordpress 417 |
| 0346 | Rregullator intensiv i klavikulave Art.2024 S,M,L (0346) | 449 | jara 449, katalog 449, wordpress 448 |
| 1052 | Genera 20compresse (1052) | 449 | jara 449, katalog 449, wordpress 404 |
| 1075 | Diclofenac Supp 100mg (1075) | 449 | katalog 449, wordpress 448 |
| 1180 | Fasho kirurgjikale 9X15cm A25 NO:523 (1180) | 449 | jara 449, katalog 449, wordpress 257 |
| 4804 | Hallux valgus – Rregullator per gisht te madh te kembes (4804) | 449 | jara 449, katalog 449 (old shop: a staged picture, not counted) |
| 9033 | Pantenol Rastvor 100ml (9033) | 449 | katalog 449, wordpress 400 |
| 9863 | Apis Gola Spray Orale 20ml (9863) | 449 | jara 449, katalog 449, wordpress 339 |
