/-  *membrane-sheet
/-  *membrane-action
/+  *membrane-dejs
/+  *membrane-enjs
!:
|_  act=action
++  grow
  |%
  ++  noun  act
  --
++  grab
  |%
  ++  noun  action
  ++  json
    =,  dejs:format
    %-  of
    :~  
      [%write (at ~[pa dejs-sheet])]
      [%create (at ~[pa so])]
      [%rename (at ~[pa so])]
      [%retag (at ~[pa (as so)])]
      [%delete pa]
      [%move (at ~[pa pa])]
      [%send-invite (at ~[(se %p) pa])]
      [%send-rsvp (se %uw)]
      [%cancel-invite (se %uw)]
      [%decline-invite (se %uw)]
    ==
  --
++  grad  %noun  
--
