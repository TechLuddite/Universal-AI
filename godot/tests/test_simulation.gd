extends SceneTree
const Simulation=preload("res://scripts/simulation.gd")
var failures: Array[String]=[]
var checks: int=0

func check(condition: bool, message: String) -> void:
	checks+=1
	if not condition:
		failures.append(message)
		push_error(message)

func advance(sim: SeedSimulation, seconds: float) -> void:
	for i in ceili(seconds*60):sim.step(1.0/60.0)

func _initialize() -> void:
	var sim:=Simulation.new()
	check(not sim.build_fab(),"Cannot buy an unfunded machine")
	check(sim.etch(),"Fresh run can etch")
	check(sim.wafers==59 and sim.chips==0,"Starting a cycle consumes one wafer but grants no output early")
	check(not sim.etch(),"Manual cycle cannot be double queued")
	advance(sim,1.0)
	check(sim.chips==1 and sim.capital==100,"Completed fabrication sells one chip for $100")
	for i in 11:
		sim.etch()
		advance(sim,1)
	check(sim.capital==1200,"Twelve manual chips finance the first machine")
	check(sim.build_fab() and sim.fabs==1 and sim.capital==0,"The first fab debits the displayed price")
	var before: int=sim.chips
	advance(sim,3.5)
	check(sim.chips>before,"An autonomous machine produces without manual input")
	var restored:=Simulation.new()
	check(restored.restore(sim.to_save()),"Save round trip is accepted")
	check(restored.to_save()==sim.to_save(),"Save preserves in-flight wafers and machine cycles")
	var json_copy := Simulation.new()
	check(json_copy.restore(JSON.parse_string(JSON.stringify(sim.to_save()))) and json_copy.chips == sim.chips, "Actual JSON saves restore after numeric type conversion")
	var bad: Dictionary=sim.to_save()
	bad.cycles=["broken"]
	check(not restored.restore(bad),"Corrupted cycle data is rejected")
	check(restored.to_save()==sim.to_save(),"Invalid restore leaves the entire current run unchanged")
	bad=sim.to_save()
	bad.version=999
	check(not restored.restore(bad),"Unknown save versions are rejected")
	var stranded:=Simulation.new()
	stranded.wafers=0
	stranded.capital=0
	check(stranded.reclaim() and stranded.wafers==3,"A bankrupt factory can recover without resetting")
	check(not stranded.reclaim(),"Emergency recovery cannot be stockpiled")
	check(not sim.upgrade(),"Overclock is gated to two fabs")
	check(not sim.toggle_controller(),"Automation is gated to three fabs")
	check(not sim.uplink(),"Uplink requires the full factory")
	# A complete headless playthrough follows the same transactions as the UI.
	# No privileged resources, time multiplier, free purchases, or state jumps.
	var run:=Simulation.new()
	var finished_at: float=0
	for i in range(60*600):
		if run.wafers<maxi(8,run.fabs*2):
			if not run.buy_wafers():run.reclaim()
		if run.fabs>=2 and not run.overclock:run.upgrade()
		if run.fabs<6:run.build_fab()
		if run.fabs>=3 and not run.controller:run.toggle_controller()
		run.etch()
		run.step(1.0/60)
		run.take_events()
		if run.uplink():
			finished_at=run.elapsed
			break
	check(run.linked,"The prototype can be completed from a fresh run within ten minutes")
	check(run.fabs==6 and run.overclock and run.controller,"A completed run uses the factory's expansion, research, and controller")
	check(run.capital>=0 and run.wafers>=0,"No transaction creates negative resources")
	var previous: int=run.chips
	advance(run,10)
	check(run.chips>previous,"Production continues after the district connects")
	var saved: Dictionary=run.to_save()
	var resumed:=Simulation.new()
	resumed.restore(saved)
	advance(run,10)
	advance(resumed,10)
	check(run.to_save()==resumed.to_save(),"Resumed automation behaves identically to uninterrupted play")
	# Pre-Chorus saves migrate in place; no reset or new save location.
	var legacy: Dictionary = {"version": 1, "capital": 2400, "wafers": 30, "chips": 90, "fabs": 6, "linked": true}
	var migrated := Simulation.new()
	check(migrated.restore(legacy) and migrated.linked and migrated.district_count() == 0, "Original uplink saves enter the new chapter without losing their factory")
	check(not migrated.plant(0), "District construction cannot spend signals it has not earned")
	var endings: Array[String] = []
	for path in 4:
		var kind: int = mini(path, 2)
		var city := Simulation.new()
		city.restore(saved)
		# Continue a legitimately earned factory through every ending; no resource grants.
		for frame in 60 * 1200:
			city.step(1.0 / 60)
			city.plant(kind)
			city.choose_charter(0 if path == 3 else kind)
			city.take_events()
			if city.broadcast():break
		endings.append(city.ending)
		check(not city.ending.is_empty(), "Each committed district can finish within twenty minutes of the uplink")
		check(city.places[kind] == 9 and city.capital >= 0 and city.signals >= 0, "Endings require real funded construction")
		var copy := Simulation.new()
		check(copy.restore(JSON.parse_string(JSON.stringify(city.to_save()))) and copy.ending == city.ending and copy.places == city.places, "A completed district can be restored from serialized JSON")
		copy.restore(city.to_save())
		advance(city, 12)
		advance(copy, 12)
		check(copy.to_save() == city.to_save(), "District resources, promises and ending survive save/reload")
	check(endings == ["THE OPEN HAND", "THE MANY", "THE UNFINISHED SUN", "THE COMMON GROUND"], "Infrastructure and charter produce three committed endings and one divergent ending")
	var revoked := Simulation.new()
	revoked.restore(saved)
	revoked.toggle_autonomy()
	revoked.toggle_autonomy()
	advance(revoked, 120)
	check(revoked.district_count() == 0 and revoked.drift_count == 0, "Revoked autonomy never spends resources or departs from a directive")
	var auto := Simulation.new()
	auto.restore(saved)
	auto.toggle_autonomy()
	for frame in 60 * 1200:
		auto.step(1.0 / 60)
		auto.choose_charter(0)
		auto.take_events()
		if auto.district_count() == 9:break
	check(not auto.choose_charter(1), "A charter cannot be rewritten after seeing the outcome")
	check(auto.places == [6, 0, 3] and auto.drift_count == 3, "Autonomy follows six garden requests then explicitly records three higher-output departures")
	check(auto.transmission.begins_with("DRIFT") and auto.history.size() <= 8, "Drift remains visible and the persisted journal is bounded")
	auto.toggle_autonomy()
	var rate: float = auto.resonance_rate()
	check(is_equal_approx(rate, 9.0), "Revoked autonomy applies its advertised 25 percent resonance cost")
	var invalid: Dictionary = auto.to_save()
	invalid.places = [10, 0, 0]
	var unchanged: Dictionary = auto.to_save()
	check(not auto.restore(invalid) and auto.to_save() == unchanged, "Invalid district saves are rejected atomically")
	print("The Seed: %d checks, %d failures. Full run: %.1fs, %d chips."%[checks,failures.size(),finished_at,run.chips])
	quit(0 if failures.is_empty() else 1)
