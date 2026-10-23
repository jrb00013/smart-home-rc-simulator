"""
Test all button codes
"""
import pytest

from button_codes import BUTTON_CODES as SERVER_BUTTON_NAMES
from tests.conftest import BUTTON_CODES, press_button, get_state


class TestAllButtons:
    """Test all available button codes"""

    @pytest.mark.parametrize("button_name,button_code", sorted(BUTTON_CODES.items()))
    def test_button_code(self, client, button_name, button_code):
        """Each named button is accepted and recorded with the server's name for it"""
        assert press_button(button_code) is True
        state = get_state()
        assert state is not None
        assert state['last_button'] == SERVER_BUTTON_NAMES[button_code]

    @pytest.mark.parametrize("button_code", sorted(SERVER_BUTTON_NAMES))
    def test_every_defined_code_accepted(self, client, ensure_tv_on, button_code):
        """Every code defined in button_codes.py is accepted without error"""
        assert press_button(button_code) is True
        assert get_state()['last_button'] == SERVER_BUTTON_NAMES[button_code]

    def test_conftest_names_match_server(self):
        """The test-side name -> code table must agree with button_codes.py"""
        for name, code in BUTTON_CODES.items():
            assert SERVER_BUTTON_NAMES.get(code) == name, (name, hex(code))
