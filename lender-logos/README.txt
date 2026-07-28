HOW TO ADD LENDER LOGOS
========================

Drop PNG files into this folder using these exact filenames (lowercase,
matching the names below). Once a file is added and the site is pushed
to GitHub, it will automatically replace the plain text name in the
homepage lender marquee — no code changes needed.

  td.png              -> TD
  scotiabank.png       -> Scotiabank
  bmo.png              -> BMO
  strive.png           -> Strive
  home-trust.png       -> Home Trust
  cmi.png              -> CMI
  keystone.png         -> Keystone
  first-national.png   -> First National
  mcap.png             -> MCAP
  rmg.png              -> RMG
  merix.png            -> Merix Financial
  b2b-bank.png         -> B2B Bank

Tips:
- Use logos with a transparent background (real PNG transparency, not a
  white box) so they look right in both light and dark mode.
- Keep them roughly the same height as each other (e.g. all ~60-80px
  tall) so the row lines up evenly — width can vary.
- If a file is missing or fails to load, that lender's name shows as
  plain text automatically, so it's safe to add them one at a time.
- Want to add a lender that's not in the list above? Add its name and
  filename to the LENDERS array in settings.js, then drop the file here.
