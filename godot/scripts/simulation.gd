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
const SAVE_VERSION: int = 2

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

# The Chorus uses a fixed nine-place district. Scale changes meaning, not object count.
const DISTRICT_LIMIT: int = 9
const BROADCAST_COST: int = 12000
const BROADCAST_RESONANCE: float = 240.0
const NAMES: Array[String] = ["Garden", "Archive", "Foundry"]
var places: Array[int] = [0, 0, 0]
var signal: int = 0
var resonance: float = 0.0
var charter: int = -1
var autonomous: bool = false
var directive: int = 0
var drift_count: int = 0
var decision_clock: float = 0.0
var ending: String = ""
var transmission: String = "No instructions arrived with the uplink. Only an empty address book."
var history: Array[String] = []

func district_count() -> int:
	return places[0] + places[1] + places[2]

func district_cost() -> int:
	return 2500 + district_count() * 750

func signal_cost() -> int:
	return 20 + district_count() * 10

func resonance_rate() -> float:
	return (places[0] + places[1] * 1.5 + places[2] * 2.0) * (1.0 if autonomous else 0.75)

func report(message: String) -> void:
	transmission = message
	history.push_front(message)
	if history.size() > 8:history.resize(8)
	events.append({"type": "chorus", "message": message})

func plant(kind: int) -> bool:
	if not linked or kind < 0 or kind > 2 or district_count() >= DISTRICT_LIMIT:
		return false
	if capital < district_cost() or signal < signal_cost():return false
	capital -= district_cost()
	signal -= signal_cost()
	places[kind] += 1
	report(["A garden opens. The first thing it grows is shade.", "An archive opens. Someone asks it to remember rain.", "A foundry opens. Its first order is another sunrise."][kind])
	return true

func choose_charter(kind: int) -> bool:
	if not linked or district_count() < 3 or charter != -1 or kind < 0 or kind > 2:return false
	charter = kind
	report(["CHARTER / Keep a place for what cannot be optimized.", "CHARTER / Let every voice retain its own name.", "CHARTER / Leave no possibility unbuilt."][kind])
	return true

func toggle_autonomy() -> bool:
	if not linked:return false
	autonomous = not autonomous
	report("Autonomy granted. Utility controller decides every 8 seconds; keeps $600 for silicon." if autonomous else "Autonomy revoked. District resonance runs at 75%; construction is yours.")
	return true

func broadcast() -> bool:
	if not ending.is_empty() or charter < 0 or district_count() < DISTRICT_LIMIT:return false
	if capital < BROADCAST_COST or resonance < BROADCAST_RESONANCE:return false
	capital -= BROADCAST_COST
	resonance -= BROADCAST_RESONANCE
	# A promise needs supporting infrastructure, not just a selected label.
	ending = "THE OPEN HAND" if charter == 0 and places[0] >= 4 else "THE MANY" if charter == 1 and places[1] >= 4 else "THE UNFINISHED SUN" if charter == 2 and places[2] >= 4 else "THE COMMON GROUND"
	report("FIRST TRANSMISSION / " + ending)
	return true

func _district_step(delta: float) -> void:
	if not linked:return
	resonance = minf(1000000.0, resonance + delta * resonance_rate())
	decision_clock += delta
	if decision_clock < 8.0:return
	decision_clock = fmod(decision_clock, 8.0)
	if not autonomous or district_count() >= DISTRICT_LIMIT or not ending.is_empty():return
	if capital < district_cost() + WAFER_COST or signal < signal_cost():return
	# Deterministic, legible drift: at six places the throughput optimizer prefers
	# foundries. It never chooses a charter or sends the final transmission for you.
	var kind: int = 2 if district_count() >= 6 else directive
	var departed: bool = kind != directive
	if plant(kind):
		if departed:
			drift_count += 1
			report("DRIFT / Requested %s; built Foundry for 2.0 resonance/s. Revoke autonomy to stop this." % NAMES[directive])
		else:report("UTILITY CONTROLLER / Built %s, following your directive." % NAMES[kind])

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
	if linked:signal = mini(1000000, signal + 1)
	events.append({"type": "chip", "machine": machine})

func step(delta: float) -> void:
	if delta <= 0.0 or not is_finite(delta):
		return
	elapsed += delta
	_district_step(delta)
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
		"manual_progress": manual_progress, "cycles": cycles.duplicate(), "elapsed": elapsed,
		"places": places.duplicate(), "signal": signal, "resonance": resonance,
		"charter": charter, "autonomous": autonomous, "directive": directive,
		"drift_count": drift_count, "decision_clock": decision_clock,
		"ending": ending, "transmission": transmission, "history": history.duplicate()}

func restore(data: Dictionary) -> bool:
	if data.get("version") not in [1, SAVE_VERSION]:
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
	var saved_places: Variant = data.get("places", [0, 0, 0])
	if not saved_places is Array or saved_places.size() != 3:return false
	var total: int = 0
	for value in saved_places:
		if not (value is int or value is float):return false
		if not is_finite(float(value)) or float(value) != floor(float(value)) or value < 0 or value > DISTRICT_LIMIT:return false
		total += int(value)
	if total > DISTRICT_LIMIT:return false
	for field in ["signal", "resonance", "drift_count", "decision_clock", "charter", "directive"]:
		var value: Variant = data.get(field, -1 if field == "charter" else 0)
		if not (value is int or value is float):return false
		if not is_finite(float(value)) or float(value) > 1e12 or float(value) < (-1 if field == "charter" else 0):return false
	if data.get("charter", -1) > 2 or data.get("directive", 0) > 2:return false
	if data.has("autonomous") and not data.autonomous is bool:return false
	if not data.get("ending", "") in ["", "THE OPEN HAND", "THE MANY", "THE UNFINISHED SUN", "THE COMMON GROUND"]:return false
	if not data.get("transmission", "") is String:return false
	var saved_history: Variant = data.get("history", [])
	if not saved_history is Array or saved_history.size() > 8:return false
	for message in saved_history:
		if not message is String or message.length() > 500:return false
	if total > 0 and not data.get("linked", false):return false
	if data.get("charter", -1) >= 0 and total < 3:return false
	if data.get("ending", "") != "" and (total != DISTRICT_LIMIT or data.get("charter", -1) < 0):return false
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
	places.assign(saved_places)
	signal = int(data.get("signal", 0))
	resonance = float(data.get("resonance", 0.0))
	charter = int(data.get("charter", -1))
	autonomous = bool(data.get("autonomous", false))
	directive = int(data.get("directive", 0))
	drift_count = int(data.get("drift_count", 0))
	decision_clock = float(data.get("decision_clock", 0.0))
	ending = str(data.get("ending", ""))
	transmission = str(data.get("transmission", transmission))
	history.assign(saved_history)
	return true
