# appshots-cli

Store-ready App Store and Google Play screenshots from the command line. It uses the same renderer as the [AppShots web editor](https://appshots.portfolio.ltd), so the output is identical: device frames, captions, glow, and the exact sizes each store accepts.

Use it to regenerate every screenshot whenever your app changes, locally or in CI.

## Install

```bash
npm install --save-dev appshots-cli     # or run it with: npx appshots-cli
```

Requires Node.js 20+. No browser, no system libraries.

## Quick start

```bash
npx appshots init        # writes a sample appshots.json
npx appshots render      # renders everything in it
```

`appshots.json` describes your screens once and lists the devices to render them for:

```json
{
  "out": "appshots-out",
  "template": "night-glow",
  "devices": {
    "ios-iphone-6.9": "raw/phone-{key}.png",
    "ios-ipad-13": { "files": "raw/ipad-{key}.png", "style": { "fontSize": 90 } },
    "play-phone": "raw/android-{key}.png",
    "play-feature-graphic": { "files": "raw/android-{key}.png", "headline": "MyApp", "subheading": "Habits that stick." }
  },
  "shots": [
    { "key": "home", "headline": "Tap once.\nKeep the chain.", "subheading": "Every habit you're building, on one screen." },
    { "key": "stats", "headline": "Know what's\nworking.", "subheading": "Momentum, consistency and best days.", "style": { "glowColor": "#e07a5f" } }
  ]
}
```

- **`shots`** are your app's screens, in store order. `key` fills `{key}` in each device's file pattern and names the output file. Use `\n` for a line break in a headline.
- **`devices`** maps a device id to the raw captures for it. Paths are relative to the config file. Single-image devices such as `play-feature-graphic` use the first shot and can set their own caption.
- **`template`** sets the look. Some templates give each screenshot its own colour.
- **`style`** fine-tunes it: at the top level for every screenshot, inside a shot for one screen, or inside a device for one device.

Output lands in store folders, numbered in upload order:

```
appshots-out/app-store/iphone-6.9/01-home.png    1320×2868
appshots-out/app-store/ipad-13/01-home.png       2064×2752
appshots-out/play-store/phone/01-home.png        1080×1920
appshots-out/play-store/feature-graphic/01-home.png  1024×500
```

## Commands

| Command | What it does |
|---|---|
| `appshots init [file]` | Create a sample config |
| `appshots render [file]` | Render every screenshot. `-o <folder>` changes the output folder, `-d <device>` renders one device |
| `appshots devices` | List device ids, export sizes and how many images each store takes |
| `appshots templates` | List template ids |

`render` exits with code 1 if a raw capture is missing, so CI catches it.

## Style options

| Option | Values |
|---|---|
| `bgColor`, `bgColor2` | Hex colours. Make them equal for a solid background |
| `gradientAngle` | Degrees |
| `glowColor`, `glowStrength`, `glowAt` | Hex colour (`""` for none), 0–100, `"text"` or `"device"` |
| `fontId` | `display`, `sans`, `serif`, `rounded`, `mono` |
| `fontSize`, `subSize` | Sizes on a 1290px-wide canvas. They scale with the output |
| `fontColor` | Hex colour |
| `textAlign`, `textPosition` | `left`/`center`/`right`, `top`/`bottom` |
| `deviceStyle` | `frame`, `flat` (floating card), `fullbleed` |
| `deviceFit`, `deviceScale` | `contain` or `fill` (runs off the edge), and a size in % |
| `tilt` | Degrees, -20 to 20 |
| `orientation` | `portrait` or `landscape`, where the device allows it |

## In CI

```yaml
- run: npx appshots-cli render
- uses: actions/upload-artifact@v4
  with:
    name: store-screenshots
    path: appshots-out
```

## Not in the CLI yet

Stickers, step-number badges and AI captions are in the web editor only.

## License

AGPL-3.0. Fonts are bundled from Fontsource under the SIL Open Font License.
