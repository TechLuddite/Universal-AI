class_name SeedSimulation
extends RefCounted

## Economy is independent of rendering, timers, input, and audio. Both the
## human and the utility controller call these same transaction methods.
const CHIP_VALUE: int = 100
const MANUAL_SECONDS: float = 0.9
const WAFER_BATCH: int = 30
const WAFER_COST: int = 600
const MAX_FABS: int = 6
const OVERCLOCK_COST: int = 2400
const UPLINK_COST: int = 6000
const SAVE_VERSION: int = 1

var capital: int = 0
var wafers: int = 60
var chips: int = 0
var fabs: int = 0
var overclock: bool = false
var controller: bool = false
var linked: bool = false
var sound_enabled: bool = true
var manual_progress: float = -1.0
var cycles: Array[float] = []
var elapsed: float = 0.0
var events: Array[Dictionary] = []

func _init() -> void:
	for i in MAX_FABS:
		cycles.append(-1.0)

func fab_cost() -> int:
	return roundi(1200.0 * pow(1.45, fabs) / 100.0) * 100

func cycle_seconds() -> float:
	return 1.8 if overclock else 3.2

func etch() -> bool:
	if manual_progress >= 0.0 or wafers <= 0:
		return false
	wafers -= 1
	manual_progress = 0.0
	events.append({"type": "start", "machine": -1})
	return true

func buy_wafers() -> bool:
	if capital < WAFER_COST:
		return false
	capital -= WAFER_COST
	wafers += WAFER_BATCH
	events.append({"type": "supply"})
	return true

func can_reclaim() -> bool:
	if wafers > 0 or capital >= WAFER_COST or manual_progress >= 0:
		return false
	for cycle in cycles:
		if cycle >= 0:return false
	return true

func reclaim() -> bool:
	if not can_reclaim():return false
	wafers += 3
	events.append({"type": "reclaim"})
	return true

func build_fab() -> bool:
	if fabs >= MAX_FABS or capital < fab_cost():
		return false
	capital -= fab_cost()
	fabs += 1
	events.append({"type": "build", "machine": fabs - 1})
	return true

func upgrade() -> bool:
	if overclock or fabs < 2 or capital < OVERCLOCK_COST:
		return false
	capital -= OVERCLOCK_COST
	overclock = true
	events.append({"type": "upgrade"})
	return true

func toggle_controller() -> bool:
	if fabs < 3:
		return false
	controller = not controller
	events.append({"type": "controller"})
	return true

func uplink() -> bool:
	if linked or fabs < MAX_FABS or capital < UPLINK_COST:
		return false
	capital -= UPLINK_COST
	linked = true
	events.append({"type": "uplink"})
	return true

func _finish(machine: int) -> void:
	chips += 1
	capital += CHIP_VALUE
	events.append({"type": "chip", "machine": machine})

func step(delta: float) -> void:
	if delta <= 0.0 or not is_finite(delta):
		return
	elapsed += delta
	# Automatic supply is explicit, opt-in, and pays the same price as a click.
	if controller and wafers < maxi(6, fabs * 2):
		if not buy_wafers():reclaim()
	if manual_progress >= 0.0:
		manual_progress += delta / MANUAL_SECONDS
		if manual_progress >= 1.0:
			manual_progress = -1.0
			_finish(-1)
	for i in fabs:
		if cycles[i] < 0.0 and wafers > 0:
			wafers -= 1
			cycles[i] = 0.0
			events.append({"type": "start", "machine": i})
		if cycles[i] >= 0.0:
			cycles[i] += delta / cycle_seconds()
			if cycles[i] >= 1.0:
				cycles[i] = -1.0
				_finish(i)

func take_events() -> Array[Dictionary]:
	var result: Array[Dictionary] = events
	events = []
	return result

func to_save() -> Dictionary:
	return {"version": SAVE_VERSION, "capital": capital, "wafers": wafers,
		"chips": chips, "fabs": fabs, "overclock": overclock,
		"controller": controller, "linked": linked, "sound_enabled": sound_enabled,
		"manual_progress": manual_progress, "cycles": cycles.duplicate(), "elapsed": elapsed}

func restore(data: Dictionary) -> bool:
	if data.get("version") != SAVE_VERSION:
		return false
	# Reject invalid files as a whole. No partial restore of a corrupted economy.
	for field in ["capital", "wafers", "chips", "fabs"]:
		var value: Variant = data.get(field)
		if not (value is int or value is float):
			return false
		if not is_finite(float(value)) or float(value) < 0 or float(value) > 1e12:
			return false
	if int(data.fabs) > MAX_FABS:
		return false
	for field in ["overclock", "controller", "linked", "sound_enabled"]:
		if data.has(field) and not data[field] is bool:return false
	for field in ["elapsed", "manual_progress"]:
		if data.has(field):
			if not (data[field] is int or data[field] is float):return false
			if not is_finite(float(data[field])):return false
	var raw_cycles: Variant=data.get("cycles",[])
	if not raw_cycles is Array or raw_cycles.size()>MAX_FABS:return false
	for value in raw_cycles:
		if not (value is int or value is float):return false
		if not is_finite(float(value)):return false
	capital = int(data.capital)
	wafers = int(data.wafers)
	chips = int(data.chips)
	fabs = int(data.fabs)
	overclock = bool(data.get("overclock", false)) and fabs >= 2
	controller = bool(data.get("controller", false)) and fabs >= 3
	linked = bool(data.get("linked", false)) and fabs == MAX_FABS
	sound_enabled = bool(data.get("sound_enabled", true))
	elapsed = maxf(0.0, float(data.get("elapsed", 0.0)))
	manual_progress = clampf(float(data.get("manual_progress", -1.0)), -1.0, 0.999)
	var saved_cycles: Variant = data.get("cycles", [])
	if saved_cycles is Array:
		for i in mini(saved_cycles.size(), MAX_FABS):
			cycles[i] = clampf(float(saved_cycles[i]), -1.0, 0.999)
	return true
