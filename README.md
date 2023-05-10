# ✒️ Tasks.md
A self-hosted file based task management board that supports Markdown syntax.

![Demonstration](./public/demonstration.gif)

## ⭐ Features
- Create cards, lists and tags in a modern and responsive interface;
- Write cards as Markdown files;
- Easy to install with a single Docker image;
- Light and dark themes synced with operating system settings;
- Heavy customizable with 3 default color themes ([Adwaita](https://gnome.pages.gitlab.gnome.org/libadwaita/doc/main/named-colors.html), [Nord](https://www.nordtheme.com/) and [Catppuccin](https://github.com/catppuccin/catppuccin));
- Support for subpath based reverse-proxy with an environment variable for base path;

## 🐋 Installation
### Docker
Paste this command:
```
docker run -d \
  --name tasks.md \
  -e PUID=1000 \
  -e PGID=1000 \
  -e TITLE="" `#optional` \
  -e BASE_PATH="" `#optional` \
  -e ENABLE_LOCAL_IMAGES=false `#optional` \
  -p 8080:8080 \
  -v /path/to/cards/:/api/files/ \
  -v /path/to/styles/:/api/static/stylesheets/ `#optional \
  -v /path/to/images/:/api/images/ `#optional \
  --restart unless-stopped \
  baldissaramatheus/tasks.md
```
Remove the optional variables and paths you don't want to keep, remove `#optional` flags for the ones you want to keep, replace `/path/to/something` with directories that exist in your filesystem, then run it. If you decide to set the optional env variable `ENABLE_LOCAL_IMAGES` as `true`, you should also map a volume for `:/api/images/` since Tasks.md does not delete local images when a card is deleted.

### docker-compose
For docker-compose, you can see an example [here](https://github.com/BaldissaraMatheus/Tasks.md/blob/main/examples/docker-compose.yaml). Use the Docker section above as reference for optional variables and volumes.

## 🎨 Customize
All CSS files are available in the public stylesheets directory, which can be mounted as a docker volume. It already comes with 3 color themes: [Adwaita](https://gnome.pages.gitlab.gnome.org/libadwaita/doc/main/named-colors.html), [Nord](https://www.nordtheme.com/) and [Catppuccin](https://github.com/catppuccin/catppuccin). To use them, open the file `/stylesheets/index.css` and change the second line to the path of the color theme you want, you can find them under `/stylesheets/color-themes`.

## 💻 Technology stack
With the goal of having a good mix of performance and maintainability, the application was built with [SolidJS](https://github.com/solidjs/solid) and [Koa](https://github.com/koajs/koa). It also uses [Stacks-Editor](https://github.com/StackExchange/Stacks-Editor) for text editing and [serve-static](https://github.com/expressjs/serve-static) to serve the css files as-is.

## 🔨 Contribute
### Bugfixes and new features requests
Feel free to create issues for encountered bugs or to request new features, just make sure to include a proper label. Also give a thumbs up to the issues you feel that are relevant to be implemented for the next releases.

### Development
If you want to contribute with its development, select one of the existing issues, develop your solution and submit a pull request, it eventually will be reviewed and may be merged with the existing code. To run the source code, open a terminal instance in the frontend directory and another instance in the backend directory, then in both of them run `npm install` and `npm start`.

