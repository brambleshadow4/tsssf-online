import {test, expect, beforeEach, group} from "./testFramework.js";
import {validateCard} from "./packLib.js";

export default function(){

	test("Half point goals", () => {

		let goalCard = {
			"title": "testcard",
			"points": "0.5"
		}

		let errors = validateCard("", "Goal", "pack:1", goalCard);

		expect(errors.length).toBe(0);
	})

	test("Negative goals", () => {

		let goalCard = {
			"title": "testcard",
			"points": "-2"
		}

		let errors = validateCard("", "Goal", "pack:1", goalCard);

		expect(errors.length).toBe(0);
	})
};