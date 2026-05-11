# autoTest to Bruno Conversion Notes

Generated collection path: `examples/autoTest-bruno-collection`.

## Source Inspection

- Source project: `F:\resource\mywork\pycharm\autoTest`.
- Detected request definitions: YAML endpoint maps under `testcase/`, `jjhy7/`, and `demo/`; pytest/Python request flows in `testcase/*.py`, `jjhy7/*.py`, and `demo/*.py`.
- Request sender behavior: `testcase/send_request_util.py` sends `GET` data as query params and non-GET data as form data.
- Existing Bruno workspace: this repo contains Bruno app source and test fixtures, but no single active user collection at the repository root.

## Conversion Scope

- Converted unique structured YAML endpoints: 267.
- Added supplemental Python demo request examples: 5.
- Total generated request files: 272.
- YAML duplicates across `testcase`, `jjhy7`, and `demo` were deduplicated by method + URL; duplicate sources are listed in each request docs block.

## Limitations / TODO

- Python pytest scenario ordering, `allure.step` boundaries, and `extract.yaml` read/write dependencies were not fully translated into Bruno scripts.
- Dynamic values such as `s_clienttime`, `s_hash`, `s_random`, generated P10/signature/certificate values, cookies, and captcha/session state require manual pre-request scripts or environment variables.
- The YAML files appear to contain mojibake for some Chinese labels; generated filenames keep stable ASCII endpoint keys where possible and preserve original text in docs/data.
- File upload parameters such as local PDF/image paths are preserved as plain params, not multipart file bodies.

## Open / Run

Open Bruno and choose **Open Collection**, then select `F:\mywork\bruno-main\examples\autoTest-bruno-collection`. Review environment/IP values before sending requests.
