::  Imports
::
/-  *membrane-sheet
/-  *membrane-action
/+  default-agent, dbug
::  Type core
::
|%
+$  state-0  (map path sheet)
+$  card  card:agent:gall
--
::  Gall agent boilerplate
::
%-  agent:dbug
=|  state-0
=*  state  -
^-  agent:gall
|_  =bowl:gall
+*  this  .
    def   ~(. (default-agent this %) bowl)
::  Agent arms (10) (mandatory)
::
::  default on-init returns [~ this]
::  send no cards (~)
::  initialize state with the agent core (this)
::
++  on-init  on-init:def
::  on-save exports state to vase for Gall for upgrade
::  this is a demo so probably this will never be used, but just in case
::
++  on-save
  ^-  vase
  !>(state)
::  on-load imports state post-upgrade
::  probably won't use this either
:: 
++  on-load
  |=  old-vase=vase
  ^-  (quip card _this)
  `this(state !<(state-0 old-vase))
::  on-poke handles pokes
::  we will handle one poke which sends the entire state
::  which we accept and use as our new state
::  (if it comes from our ship)
::
++  on-poke
  |=  [=mark =vase]
  ^-  (quip card _this)
  ?>  =(our.bowl src.bowl)
  ?.  ?=(%membrane-action mark)
    (on-poke:def mark vase)
  =/  act  !<(action vase)
  ?-  -.act
    %replace
      `this(state (~(put by state) path.meta.act +.act))
    ==
::  We are not accepting subscriptions at this time.
::
++  on-watch  on-watch:def
++  on-agent  on-agent:def
++  on-leave  on-leave:def
::
++  on-peek
  |=  pax=path
  ^-  (unit (unit cage))
  ?.  ?=([%x @ *] pax)
    ~
  ?+  i.t.pax  (on-peek:def pax)
    %retrieve
      =/  rsv=(unit sheet)  (~(get by state) t.t.pax)
      ?~  rsv
        [~ ~]
      :^  ~  ~  %sheet
        !>(u.rsv)
    %tree
      =/  rsv=(set path)  ~(key by state)
      :^  ~  ~  %membrane-tree
        !>(rsv)
  ==
::  We will not be accepting calls from Arvo at this time
::
++  on-arvo  on-arvo:def
++  on-fail  on-fail:def
--