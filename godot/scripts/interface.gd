class_name FactoryInterface
extends CanvasLayer

signal action_requested(action: String)
const INK := Color("0d1a24")
const BORDER := Color("304853")
const MUTED := Color("8ba3b0")
const WHITE := Color("e6e9df")
const GOLD := Color("f4ca7a")
const TEAL := Color("84dfcf")

var root: Control
var top_shade: TextureRect
var bottom_shade: TextureRect
var title: Label
var subtitle: Label
var money: Label
var wafers: Label
var output: Label
var count: Label
var metric_box: HBoxContainer
var chapter_panel: PanelContainer
var chapter_title: Label
var chapter_note: Label
var objective: Label
var objective_progress: ProgressBar
var objective_numbers: Label
var journal: Label
var selection_label: Label
var dock: GridContainer
var buttons: Dictionary = {}
var captions: Dictionary = {}
var headings: Dictionary = {}
var etch_progress: ProgressBar
var toast: PanelContainer
var toast_label: Label
var toast_time: float = 0.0
var mute_button: Button
var help: Label
var hint: Label
var reset_confirm: ConfirmationDialog
var screen_size := Vector2.ZERO
var focus_mode: bool = false
var selected: int = -1

func _style(bg: Color = INK, line: Color = BORDER, radius: int = 5) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.border_color = line
	s.set_border_width_all(1)
	s.set_corner_radius_all(radius)
	s.content_margin_left=16
	s.content_margin_right=16
	s.content_margin_top=12
	s.content_margin_bottom=12
	return s

func _label(text: String, size: int = 14, color: Color = WHITE) -> Label:
	var node := Label.new()
	node.text=text
	node.add_theme_font_size_override("font_size",size)
	node.add_theme_color_override("font_color",color)
	node.mouse_filter=Control.MOUSE_FILTER_IGNORE
	return node

func _ready() -> void:
	layer=10
	root=Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter=Control.MOUSE_FILTER_IGNORE
	add_child(root)
	top_shade=_shade(false)
	bottom_shade=_shade(true)
	root.add_child(top_shade)
	root.add_child(bottom_shade)
	var brand := _label("UNIVERSAL AI",21,WHITE)
	brand.position=Vector2(28,24)
	root.add_child(brand)
	var edition := _label("T H E  S E E D   /   A  F A B R I C A T I O N  S T O R Y",9,MUTED)
	edition.position=Vector2(30,53)
	root.add_child(edition)
	title=_label("A small beginning.",34,WHITE)
	title.position=Vector2(28,115)
	root.add_child(title)
	subtitle=_label("One wafer. One machine. An unreasonable ambition.",12,MUTED)
	subtitle.position=Vector2(30,160)
	root.add_child(subtitle)
	metric_box=HBoxContainer.new()
	metric_box.add_theme_constant_override("separation",30)
	root.add_child(metric_box)
	money=_metric("CAPITAL",GOLD)
	wafers=_metric("WAFERS",WHITE)
	output=_metric("CHIPS SHIPPED",TEAL)
	count=_metric("AUTONOMOUS FABS",WHITE)
	chapter_panel=PanelContainer.new()
	chapter_panel.add_theme_stylebox_override("panel",_style(Color(0.045,0.085,0.12,0.93),BORDER))
	root.add_child(chapter_panel)
	var chapter_box:=VBoxContainer.new()
	chapter_box.add_theme_constant_override("separation",13)
	chapter_panel.add_child(chapter_box)
	chapter_box.add_child(_label("O B J E C T I V E   /   0 1",10,GOLD))
	chapter_title=_label("Build the machine\nthat builds the machine.",22,WHITE)
	chapter_box.add_child(chapter_title)
	chapter_note=_label("Etch 12 chips. Sales are automatic.\nThen install your first autonomous fab.",12,MUTED)
	chapter_note.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	chapter_box.add_child(chapter_note)
	var sep:=HSeparator.new()
	sep.modulate=Color("385360")
	chapter_box.add_child(sep)
	objective=_label("FIRST AUTONOMOUS FAB",10,TEAL)
	chapter_box.add_child(objective)
	objective_progress=ProgressBar.new()
	objective_progress.show_percentage=false
	objective_progress.custom_minimum_size=Vector2(0,4)
	var track:=_style(Color("263d45"),Color.TRANSPARENT,0)
	track.content_margin_top=0
	track.content_margin_bottom=0
	objective_progress.add_theme_stylebox_override("background",track)
	var fill:=_style(TEAL,Color.TRANSPARENT,0)
	fill.content_margin_top=0
	fill.content_margin_bottom=0
	objective_progress.add_theme_stylebox_override("fill",fill)
	chapter_box.add_child(objective_progress)
	objective_numbers=_label("$0 / $1,200",11,MUTED)
	chapter_box.add_child(objective_numbers)
	chapter_box.add_child(_label("S Y S T E M  T R A N S M I S S I O N",9,MUTED))
	journal=_label("The room is quiet.\nThat part is temporary.",13,WHITE)
	journal.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	chapter_box.add_child(journal)
	selection_label=_label("CELL 00   /   MANUAL LITHOGRAPHY",10,TEAL)
	root.add_child(selection_label)
	dock=GridContainer.new()
	dock.columns=6
	dock.add_theme_constant_override("h_separation",8)
	dock.add_theme_constant_override("v_separation",8)
	root.add_child(dock)
	_make_action("etch","01 / FABRICATE","Etch a chip","SPACE  ·  1 wafer > $100",true)
	_make_action("supply","02 / PROCUREMENT","Order silicon","$600  ·  +30 wafers")
	_make_action("fab","03 / EXPANSION","Install a fab","$1,200  ·  bay 01")
	_make_action("upgrade","04 / RESEARCH","Overclock","2 fabs required")
	_make_action("controller","05 / AUTONOMY","Supply controller","3 fabs required")
	_make_action("uplink","06 / BEYOND","District uplink","6 fabs required")
	etch_progress=ProgressBar.new()
	etch_progress.mouse_filter=Control.MOUSE_FILTER_IGNORE
	etch_progress.show_percentage=false
	etch_progress.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	etch_progress.offset_top=-4
	for part in ["background","fill"]:
		var bar_style:=StyleBoxFlat.new()
		bar_style.bg_color=Color("87dbc2") if part=="fill" else Color.TRANSPARENT
		etch_progress.add_theme_stylebox_override(part,bar_style)
	buttons.etch.add_child(etch_progress)
	mute_button=_small_button("SOUND ON",func():action_requested.emit("sound"))
	root.add_child(mute_button)
	var reset:=_small_button("NEW RUN",func():reset_confirm.popup_centered())
	reset.name="ResetButton"
	root.add_child(reset)
	var view:=_small_button("CINEMA",func():action_requested.emit("view"))
	view.name="ViewButton"
	root.add_child(view)
	var detail:=_small_button("CLOSE UP",func():action_requested.emit("inspect"))
	detail.name="DetailButton"
	root.add_child(detail)
	help=_label("SPACE etch   ·   B build   ·   R restock   ·   drag to orbit   ·   scroll to zoom   ·   F cinema",10,MUTED)
	root.add_child(help)
	hint=_label("CLICK THE CENTRAL MACHINE TO ETCH",11,GOLD)
	root.add_child(hint)
	toast=PanelContainer.new()
	toast.add_theme_stylebox_override("panel",_style(Color("172e36"),GOLD))
	root.add_child(toast)
	toast_label=_label("",16,WHITE)
	toast_label.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
	toast.add_child(toast_label)
	toast.visible=false
	reset_confirm=ConfirmationDialog.new()
	reset_confirm.title="Begin again?"
	reset_confirm.dialog_text="This resets the Godot prototype's factory and local save."
	reset_confirm.confirmed.connect(func():action_requested.emit("reset"))
	root.add_child(reset_confirm)
	_layout()

func _shade(reverse: bool) -> TextureRect:
	var node:=TextureRect.new()
	node.mouse_filter=Control.MOUSE_FILTER_IGNORE
	var texture:=GradientTexture2D.new()
	texture.width=4
	texture.height=128
	texture.fill_from=Vector2(0,0)
	texture.fill_to=Vector2(0,1)
	var gradient:=Gradient.new()
	gradient.set_color(0,Color(0.02,0.05,0.08,0.0 if reverse else 0.94))
	gradient.set_color(1,Color(0.02,0.05,0.08,0.94 if reverse else 0.0))
	texture.gradient=gradient
	node.texture=texture
	node.expand_mode=TextureRect.EXPAND_IGNORE_SIZE
	return node

func _metric(caption: String, color: Color) -> Label:
	var v:=VBoxContainer.new()
	v.add_theme_constant_override("separation",3)
	metric_box.add_child(v)
	v.add_child(_label(caption,9,MUTED))
	var value:=_label("0",22,color)
	v.add_child(value)
	return value

func _small_button(text: String, callback: Callable) -> Button:
	var b:=Button.new()
	b.text=text
	b.add_theme_font_size_override("font_size",10)
	b.add_theme_color_override("font_color",MUTED)
	b.add_theme_stylebox_override("normal",_style(Color(0.04,0.07,0.1,0.85),BORDER,3))
	b.add_theme_stylebox_override("hover",_style(Color("233a44"),GOLD,3))
	b.add_theme_stylebox_override("focus",_style(Color.TRANSPARENT,GOLD,3))
	b.pressed.connect(callback)
	return b

func _make_action(id: String, kicker: String, text: String, detail: String, primary: bool=false) -> void:
	var b:=Button.new()
	b.custom_minimum_size=Vector2(160,91)
	b.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	b.mouse_default_cursor_shape=Control.CURSOR_POINTING_HAND
	b.add_theme_stylebox_override("normal",_style(Color("eed095") if primary else Color(0.045,0.085,0.12,0.97),GOLD if primary else BORDER))
	b.add_theme_stylebox_override("hover",_style(Color("ffe0a1") if primary else Color("243c46"),GOLD))
	b.add_theme_stylebox_override("pressed",_style(Color("bfa366") if primary else Color("1d323b"),TEAL))
	b.add_theme_stylebox_override("disabled",_style(Color(0.04,0.075,0.10,0.94),Color("263a46")))
	b.add_theme_stylebox_override("focus",_style(Color.TRANSPARENT,GOLD))
	b.pressed.connect(func():action_requested.emit(id))
	var margin:=MarginContainer.new()
	margin.mouse_filter=Control.MOUSE_FILTER_IGNORE
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for side in ["left","right"]:margin.add_theme_constant_override("margin_"+side,14)
	for side in ["top","bottom"]:margin.add_theme_constant_override("margin_"+side,12)
	b.add_child(margin)
	var content:=VBoxContainer.new()
	content.mouse_filter=Control.MOUSE_FILTER_IGNORE
	content.add_theme_constant_override("separation",5)
	margin.add_child(content)
	var kicker_label:=_label(kicker,8,Color("48544e") if primary else MUTED)
	content.add_child(kicker_label)
	var h:=_label(text,16,INK if primary else WHITE)
	content.add_child(h)
	var d:=_label(detail,10,Color("384b44") if primary else MUTED)
	content.add_child(d)
	buttons[id]=b
	headings[id]=h
	captions[id]=d
	dock.add_child(b)

func _layout() -> void:
	screen_size=root.get_viewport_rect().size
	var w: float=screen_size.x
	var h: float=screen_size.y
	var compact: bool=w<1050
	top_shade.size=Vector2(w,240)
	bottom_shade.size=Vector2(w,220 if compact else 175)
	bottom_shade.position=Vector2(0,h-bottom_shade.size.y)
	top_shade.visible=not focus_mode
	bottom_shade.visible=not focus_mode
	metric_box.position=Vector2(maxf(350,w-655),25)
	metric_box.add_theme_constant_override("separation",16 if compact else 30)
	chapter_panel.position=Vector2(w-304,115)
	chapter_panel.size=Vector2(276,0)
	chapter_panel.visible=not focus_mode and w>=1000
	title.visible=not focus_mode and h>650
	subtitle.visible=title.visible
	if compact:
		dock.columns=3
		dock.position=Vector2(18,h-228)
		dock.size=Vector2(w-36,190)
	else:
		dock.columns=6
		dock.position=Vector2(24,h-131)
		dock.size=Vector2(w-48,92)
	for b: Button in buttons.values():
		b.custom_minimum_size.x=0
	dock.visible=not focus_mode
	selection_label.position=Vector2(28,dock.position.y-25)
	selection_label.visible=not focus_mode
	help.position=Vector2(28,h-24)
	help.text="SPACE etch  ·  B build  ·  R restock  ·  drag to orbit  ·  scroll to zoom  ·  C close up  ·  F cinema" if w>1050 else "SPACE etch  ·  B build  ·  drag to orbit  ·  F cinema"
	help.visible=not focus_mode
	hint.position=Vector2(30,190)
	hint.visible=not focus_mode and h>650
	root.get_node("DetailButton").position=Vector2(w-380,78)
	mute_button.position=Vector2(w-276,78)
	root.get_node("ResetButton").position=Vector2(w-172,78)
	root.get_node("ViewButton").position=Vector2(w-88,78)
	toast.position=Vector2(w*0.5-260,90)
	toast.size=Vector2(520,0)
	# Portrait keeps the actual controls usable; the world can still be orbited.
	if w<650:
		dock.columns=2
		dock.position.y=h-330
		dock.size.y=294
		selection_label.position.y=dock.position.y-25
		bottom_shade.size.y=350
		bottom_shade.position.y=h-350
		metric_box.position=Vector2(24,86)
		metric_box.add_theme_constant_override("separation",18)
		for child in metric_box.get_children():
			child.get_child(0).add_theme_font_size_override("font_size",7)
			child.get_child(1).add_theme_font_size_override("font_size",17)
		mute_button.position=Vector2(w-100,18)
		root.get_node("ResetButton").visible=false
		root.get_node("ViewButton").visible=false
		root.get_node("DetailButton").visible=false
		title.visible=false
		subtitle.visible=false
		hint.visible=false
		for label: Label in headings.values():label.add_theme_font_size_override("font_size",12)
		for label: Label in captions.values():label.add_theme_font_size_override("font_size",8)
		toast.position=Vector2(16,140)
		toast.size=Vector2(w-32,0)
		toast_label.add_theme_font_size_override("font_size",12)

func update(sim: SeedSimulation, delta: float, saving: bool) -> void:
	if root.get_viewport_rect().size!=screen_size:_layout()
	chapter_panel.size.y=440
	money.text="$%s"%_number(sim.capital)
	wafers.text=_number(sim.wafers)
	wafers.add_theme_color_override("font_color",Color("ed9175") if sim.wafers<6 else WHITE)
	output.text=_number(sim.chips)
	count.text="%d / 6"%sim.fabs
	buttons.etch.disabled=sim.manual_progress>=0 or sim.wafers==0
	buttons.supply.disabled=sim.capital<sim.WAFER_COST and not sim.can_reclaim()
	headings.supply.text="Reclaim scrap" if sim.can_reclaim() else "Order silicon"
	captions.supply.text="FREE · 3 emergency wafers" if sim.can_reclaim() else "$600 · +30 wafers"
	buttons.fab.disabled=sim.capital<sim.fab_cost() or sim.fabs>=6
	buttons.upgrade.disabled=sim.overclock or sim.fabs<2 or sim.capital<sim.OVERCLOCK_COST
	buttons.controller.disabled=sim.fabs<3
	buttons.uplink.disabled=sim.linked or sim.fabs<6 or sim.capital<sim.UPLINK_COST
	# Disabled primary controls stay legible on the darker surface.
	headings.etch.add_theme_color_override("font_color",MUTED if buttons.etch.disabled else INK)
	captions.etch.add_theme_color_override("font_color",MUTED if buttons.etch.disabled else Color("384b44"))
	headings.etch.text="Etching…" if sim.manual_progress>=0 else "Etch a chip"
	captions.etch.text="OUT OF SILICON" if sim.wafers==0 and sim.manual_progress<0 else "SPACE · 1 wafer > $100"
	etch_progress.value=maxf(0.0,sim.manual_progress)*100
	captions.fab.text="$%s · bay %02d"%[_number(sim.fab_cost()),sim.fabs+1] if sim.fabs<6 else "ALL BAYS CONNECTED"
	captions.upgrade.text="ACTIVE · 1.8s / chip" if sim.overclock else "$2,400 · 1.8s / chip" if sim.fabs>=2 else "2 fabs required"
	captions.controller.text="ON · buys low stock" if sim.controller else "OFF · click to enable" if sim.fabs>=3 else "3 fabs required"
	headings.controller.text="Supply controller"
	captions.uplink.text="DISTRICT CONNECTED" if sim.linked else "$6,000 · ignite network" if sim.fabs>=6 else "6 fabs required"
	mute_button.text="SOUND ON" if sim.sound_enabled else "MUTED"
	if sim.linked:
		title.text="A much larger beginning."
		chapter_title.text="The district\nis listening."
		chapter_note.text="Your factory is now a node in something larger. This is where The Seed ends. Your machines can keep running."
		objective.text="PROTOTYPE COMPLETE"
		objective_progress.value=100
		objective_numbers.text="6 / 6 bays · uplink established"
	elif sim.fabs>0:
		title.text="The room has a rhythm."
		chapter_title.text="Make yourself\nredundant."
		chapter_note.text="Fill six machine bays. Overclock the line. At three fabs, let the supply controller order your wafers."
		objective.text="DISTRICT UPLINK" if sim.fabs>=6 else "NEXT AUTONOMOUS FAB"
		var target: int=sim.UPLINK_COST if sim.fabs>=6 else sim.fab_cost()
		objective_progress.value=minf(100,float(sim.capital)/target*100)
		objective_numbers.text="$%s / $%s"%[_number(sim.capital),_number(target)]
	else:
		objective_progress.value=minf(100,float(sim.capital)/sim.fab_cost()*100)
		objective_numbers.text="$%s / $1,200"%_number(sim.capital)
	if sim.fabs>0:hint.text="CLICK A MACHINE TO INSPECT · CLICK AN EMPTY BAY TO BUILD"
	selection_label.text=("CELL 00 / MANUAL LITHOGRAPHY" if selected<0 else "CELL %02d / AUTONOMOUS FAB"%(selected+1))+ ("    ·    LOCAL SAVE" if saving else "    ·    SESSION ONLY")
	if toast_time>0:
		toast_time-=delta
		toast.modulate.a=minf(1.0,toast_time*2.0)
		toast.visible=toast_time>0

func _number(value: int) -> String:
	var raw:=str(value)
	var result: String=""
	for i in range(raw.length()):
		if i>0 and (raw.length()-i)%3==0:result+=","
		result+=raw[i]
	return result

func notify(text: String, big: bool = false) -> void:
	journal.text=text
	if big:
		toast_label.text=text
		toast_time=4.5
		toast.visible=true
		toast.modulate.a=1.0

func toggle_view() -> void:
	focus_mode=not focus_mode
	root.get_node("ViewButton").text="EXIT" if focus_mode else "CINEMA"
	_layout()
