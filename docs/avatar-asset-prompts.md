# KpopQuiz Avatar Asset Generation Prompts

A consistent, layerable avatar set for the avatar builder (M1.27). You generate the art (Gemini); these
prompts keep style + alignment consistent so the layers composite cleanly.

No copyrighted material: original kawaii designs only. Never generate real idol likenesses, real group
logos, album art, or a specific fandom's official lightstick/merch. Items stay generic ("a lightstick",
not "[group]'s lightstick"). No text or lyrics on any asset.

## Consistency workflow (read first)

Layered avatars only work if every asset shares the same style, canvas, and character position.

1. Generate the BASE rabbit first (the canonical character). Keep it as your reference.
2. For each layer (hair, hat, clothes, item), generate it as a SEPARATE transparent PNG on the SAME
   1024x1024 canvas, positioned where it sits on the base. Best results in Gemini: use the base rabbit
   as a reference image ("keep this exact rabbit, same size and position, add X"), then mask/erase the
   rabbit so only the layer remains. This keeps the character identical across assets.
3. Paste the MASTER STYLE BLOCK into EVERY prompt so the style never drifts.
4. Composite order in the builder: background -> base rabbit -> clothes -> hair -> hat -> item -> frame.

## Reusable layer prompt (locks the rabbit, add one component)

Attach the base rabbit PNG as an input/reference image, then paste this and fill [COMPONENT] + [ANCHOR]:

"Use the attached image as the EXACT base. This chibi black rabbit must stay 100% identical: do NOT
redraw, recolor, resize, reposition, restyle, or alter the rabbit, its black outline, its face, its
eyes, its pose, or its proportions in any way. Keep it on the same 1024x1024 canvas, same position,
transparent background. Add ONLY: [COMPONENT], placed [ANCHOR]. Match the existing art style exactly:
flat kawaii vector, thick rounded black outline of the same weight, minimal flat shading, soft and
cute, pink (#E8457A) accents only where natural. It must look drawn by the same artist in the same
style. Output the same rabbit, unchanged, with only that element added. Transparent background,
1024x1024, no text, no watermark."

Anchors: hat = "on top of the head between the ears"; hair = "on the top/front of the head"; clothes =
"on the torso/body only"; item = "held in one paw, beside the body"; glasses = "over the eyes".

To get a separable LAYER: after generating, erase/background-remove the rabbit so only the new element
remains on transparent (more reliable), or append "Also output a second version showing ONLY the added
element on a transparent background, rabbit removed, in the exact same position."

## Master style block (paste into every prompt)

"Flat kawaii vector illustration. The KpopQuiz mascot: a chibi black rabbit with a thick rounded black
outline, big simple round eyes, tiny pink blush, a small pink (#E8457A) four-point sparkle star accent,
minimal flat shading, soft and cute. Front-facing, centered, consistent chibi proportions, generous
margin. Transparent background. Square 1024x1024. Clean, no text, no watermark."

## 1. Base character
[master block] + "The base avatar: the full chibi black rabbit, front-facing, friendly neutral
expression, plain body, NO clothes, NO hat, NO accessories. This is the blank base every layer sits on."
Also generate a few alternate FACES (happy, wink, cool/sunglasses-off, surprised) as swappable
expression layers, each transparent and aligned to the base head.

## 2. Hair / head-fur (layer: head)
[master block] + "ONLY a [STYLE] hairstyle for the chibi rabbit, sized and positioned to sit on top of
the head, nothing else, transparent background."
Styles to make: side-swept bangs, twin buns, short tuft, long straight, wavy, high ponytail, kpop
mullet, space buns, slick-back.

## 3. Clothes / outfits (layer: body)
[master block] + "ONLY a [OUTFIT] worn on the chibi rabbit's torso/body, positioned where the body
sits, no head, transparent background."
Outfits: hoodie, varsity jacket, generic stage outfit, school uniform, denim jacket, oversized tee,
sparkly performance top, puffer jacket.

## 4. Hats / headwear (layer: head-top)
[master block] + "ONLY a [HAT], positioned to sit on top of the rabbit's head, transparent background,
nothing else."
Hats: bucket hat, beanie, baseball cap, headphones, flower crown, tiny tiara, bow, chef hat (fun).

## 5. Items (layer: hand/side, ORIGINAL + generic)
[master block] + "ONLY a [ITEM], an original generic design, positioned beside or held, transparent
background."
Items: a generic lightstick (original shape), a microphone, a blank photocard, a heart balloon, a star
wand, a boba cup, headphones, a bouquet. (All generic, never a real fandom's official item.)

## 6. Backgrounds (layer: behind)
"A soft kawaii avatar background field: [THEME], gentle, brand-safe, behind a centered character. Solid,
gradient, or simple pattern. 1024x1024, no character, no text."
Themes: pink gradient, sparkle confetti, stage spotlight, pastel sky, holographic shimmer, plus a
solid-color option so users can pick their bias-group color.

## 7. Frames / borders (the M1.22 frame system)
[master block] + "ONLY a decorative circular avatar FRAME ring, [STYLE], with a transparent center so
the avatar shows through, transparent background, 1024x1024."
Styles: simple brand-pink ring, sparkle ring, gold "Top Creator" ring, seasonal (snow, hearts),
holographic, "Founding Fan" special.

## Handoff
Export each as a transparent PNG named category_slot (e.g. hair_twin-buns.png, hat_beanie.png,
item_lightstick.png, bg_holographic.png, frame_top-creator.png, face_wink.png). Hand the set to Claude
Code for the avatar builder (M1.27), which composites the layers in the order above.
