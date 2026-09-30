import unittest

from app.services.advisory import get_advisory


class AdvisoryLogicTests(unittest.TestCase):
    def test_improving_crop_keeps_current_treatment(self):
        advice = get_advisory("Early Blight", "Moderate", "improving")
        self.assertIn("continue", advice["next_action"].lower())
        self.assertIn("improving", advice["explanation"].lower())

    def test_worsening_crop_recommends_alternative(self):
        advice = get_advisory("Late Blight", "High", "worsening")
        self.assertIn("alternative", advice["next_action"].lower())
        self.assertIn("not improving", advice["explanation"].lower())


if __name__ == "__main__":
    unittest.main()
