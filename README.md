<p align="center">
  <img src="https://raw.githubusercontent.com/gilangabdian/henkei/main/public/icon.svg" width="200" alt="Henkei Logo">
</p>

# Henkei | へんけい
Henkei is a React component for transforming words with animation. It smoothly transforms each letter into the corresponding letter of the next word

## 📦 Installation

```bash
   pnpm install henkei
```

## 🐣 Usage
```tsx
import {Henkei} from 'henkei'

export default function App(){
  return (
    <div>
      <Henkei
        words={["Hello","World"]}
        interval={1000}
        duration={500}
        fontUrl="https://unpkg.com/@fontsource/chewy@5.0.8/files/chewy-latin-400-normal.woff"
        className='text-7xl font-chewy mb-2 tracking-wide text-left text-[#3D3522]'
      />
    </div>
  )
}
```

If you want the word to transform into a word that has an extreme form like words in Japanese, Chinese, Korean, etc. You have to find or download a font that supports this and put it in the `fontUrl` attribute

## 🛠️ API Reference

| Prop        | Type       | Default Value | Description |
| :---        | :---       | :---          | :---        |
| **`words`** | `string[]` | *(Required)*  | Array of strings containing the words to transition between. |
| **`interval`**| `number`   | `3000`        | Time in milliseconds between each word transition cycle. |
| **`duration`**| `number`   | `1000`        | The duration in milliseconds of the morphing animation itself. |
| **`className`**| `string`  | `undefined`   | Standard React class name applied to the outer wrapper element. |
| **`fontUrl`** | `string`   | `"https://unpkg.com/@fontsource/inter@5.0.19/files/inter-latin-400-normal.woff"` | URL to a valid `.ttf` or `.woff` font file containing the characters you want to render. |

## 📜 License

[MIT](./LICENSE)