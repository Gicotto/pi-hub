from functools import lru_cache

try:
    from manuf import manuf as manuf_lib
    _parser = manuf_lib.MacParser()

    @lru_cache(maxsize=512)
    def lookup_vendor(mac: str) -> str:
        if not mac or mac == "Unknown":
            return "Unknown"
        try:
            result = _parser.get_manuf(mac)
            return result or "Unknown"
        except Exception:
            return "Unknown"

except Exception:
    @lru_cache(maxsize=512)
    def lookup_vendor(mac: str) -> str:  # noqa: F811
        return "Unknown"

