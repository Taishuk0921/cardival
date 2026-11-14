HOW TO ADD YOUR OWN CARD DESIGNS
1. Save your artwork in this "cards" folder (JPG or PNG, 4:5 shape, for example 1080 x 1350 pixels, under 300 KB).
2. Open ../cards.json and add a line for the card, or add "img" to an existing one:
   {"id":25,"c":"Birthday","e":"🎂","t":"Happy Birthday!","g":["#ff9a5a","#e0447c"],"m":"Your default message","img":"/cards/birthday-1.jpg"}
   - id must be a new unique number (1 to 500)
   - c must be one of: Birthday, Love, Friendship, Thank you, Congrats, Eid & Festivals, Puja
   - g is the backup gradient shown while the picture loads
   - leave empty space in the artwork where the name and message will appear
3. Only use artwork you made or are licensed to use.
