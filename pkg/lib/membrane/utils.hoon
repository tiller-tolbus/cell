/-  *membrane-sheet
/-  *membrane-share
|%
::  editing utilities
::  mostly for temp filesystem
::  and therefore soon to be irrelevant
::
++  create-sheet
  |=  [pax=path tit=@t =bowl:gall]
  ^-  sheet
  ::  meta
  :-  ^-  sheet-meta
  :*
    ::  id
    ^-  @uw  (cut 0 [0 32] eny:bowl)
    ::  path
    ^-  path  pax
    ::  title
    ^-  @t  tit
    ::  owner
    ^-  @p  our.bowl
    ::  tags
    ^-  (set tag)  ~
    ::  row-meta
    ^-  (map @ud (set visual))  ~
    ::  column-meta
    ^-  (map @ud (set visual))  ~
    ::  row-count
    ^-  @ud  100
    ::  column-count
    ^-  @ud  26
    ::  whitelist
    ^-  whitelist  ~
    ::  last-modified
    ^-  @da  now:bowl
  ==
  ::  data
  ^-  (map address scell)  ~
++  filter-tree
  ::  get a tree of valid paths under a dir path
  |=  [dir=path tree=(list path)]
  ^-  (list path)
  ::  if dir is null, return whole tree (treat null as root)
  ?~  dir  tree
  ::  otherwise loop over the tree and filter paths
  =|  filt=(list path)
  |-
  ?~  tree
    filt
  %=  $
    tree  t.tree
    filt  (filter-path i.tree dir filt)
  ==
++  filter-path
  ::  add pax to filt if in dir
  |=  [pax=path dir=path filt=(list path)]
  ?.  =((find dir pax) [~ 0])
    filt
  :-  pax  filt
++  rename-sheet
  ::  change the title of sheet 
  |=  [trgt=sheet tit=@t]
  ^-  sheet
  trgt(title.meta tit)
++  rename-gate
  ::  rename sheet, as a gate (for jab)
  |=  tit=@t
  ^-  $-(sheet sheet)
  |=  trgt=sheet
  ^-  sheet
  trgt(title.meta tit)
++  retag-gate
  ::  retag sheet, as a gate
  |=  tags=(set tag)
  ^-  $-(sheet sheet)
  |=  trgt=sheet
  ^-  sheet
  trgt(tags.meta tags)
++  move-sheet
  ::  remove a sheet and add with a different path
  |=  [max=(map path sheet) opax=path npax=path]
  ^-  (map path sheet)
  =/  sht=sheet  (~(got by max) opax)
  =/  rm=(map path sheet)  (~(del by max) opax)
  %-  ~(put by rm)
  :-  npax
  sht(path.meta npax)
++  tree-to-metatree
  ::  get just metadata for every path in tree
  |=  [tree=(list path) prefix=path]
  ^-  (map path sheet-meta)
  %-  molt
  %-  turn
  :-  tree
    |=  pax=path
    ^-  [path sheet-meta]
    :-  pax
    =<  meta
    ^-  sheet
    .^(sheet %cx (weld prefix pax))
++  update-time
  |=  [what=sheet when=@da]
  ^-  sheet
  what(last-modified.meta when)
::  sharing utilities
::
++  process-appeal
  ::  turn an appeal into an invitation
  |=  [=appeal who=@p when=@da]
  ^-  invitation
  [who what.appeal when where.appeal %waiting]
++  process-appeal-out
  |=  [=appeal who=@p when=@da]
  ^-  invitation
  [who what.appeal when where.appeal %invited]
++  verify-access
  ::  check to see if user has access to sheet
  |=  [who=@p what=sheet]
  ^-  ?
  =/  acc=(unit access)  (~(get by whitelist.meta.what) who)
  ?~  acc
    %.n
  ?|
    .=  u.acc  %read
    .=  u.acc  %write
  ==
++  mark-status
  ::  mark an invitation as %waiting, %granted, %sent, or %received
  |=  stat=status
  ^-  $-(invitation invitation)
  |=  inv=invitation
  ^-  invitation
  inv(why stat)
++  create-id
  |=  eny=@uvJ
  ^-  @uw
  (cut 0 [0 32] eny)
::  clay utils
++  base-card
  |=  =soba:clay
  ^-  card:agent:gall
  :-  %pass  :-  /membrane/info
  ^-  note:agent:gall
  :-  %arvo
  ^-  note-arvo
  :-  %c
  ^-  task:clay
  :-  %info  :-  %membrane
  ^-  nori:clay
  :-  %&  soba
++  ins-card
  |=  [=path =sheet]
  ^-  card:agent:gall
  %-  base-card
  ^-  soba:clay
  :~  
    :-  path  `miso:clay`[%ins %sheet !>(sheet)]
  ==
++  mut-card
  |=  [=path =sheet]
  ^-  card:agent:gall
  %-  base-card
  ^-  soba:clay
  :~  
    :-  path  `miso:clay`[%mut %sheet !>(sheet)]
  ==
++  del-card
  |=  =path
  ^-  card:agent:gall
  %-  base-card
  ^-  soba:clay
  :~  
    :-  path  `miso:clay`[%del ~]
  ==
++  move-card
  |=  [opax=path npax=path =sheet]
  ^-  card:agent:gall
  %-  base-card
  ^-  soba:clay
  :~  
    :-  npax  `miso:clay`[%ins %sheet !>(sheet)]
    :-  opax  `miso:clay`[%del ~]
  ==
++  wrap-path  
  ::  transform naive path into full clay path
  ::  add ship, desk, timestamp, and mark
  |=  pax=path
  ^-  path
  (zing ~[/sheets pax /sheet])
++  unwrap-path
  ::  transform clay path back into naive path
  |=  pax=path
  ^-  path
  (snip (tail pax))
--