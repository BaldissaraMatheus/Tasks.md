# Migration guide from 2.X.X to 3.0.X
3.0 release was a pretty big one, and some things require to be changed to work properly.

## Breaking changes
- CSS import paths and custom properties (variables) were replaced with new ones;
- Local images paths changed from `host/api/images` to `host/_api/image`;
- Tags syntax changed from `tags: a, b, c` to `[tag:a]`.

## How to upgrade to 3.X.X
First of all stop all Tasks.md containers if you have any running. Then do the following:
- (Optional) If you have any custom file within `color-themes` or have changed `custom.css`, backup those files somewhere.
- The directory `/config/stylesheets` must be deleted, as it will be recreated when the new container starts. Then create a new container with the latest docker image. If you followed the previous step, move your color-themes back and copy and paste any changes you had in the custom.css file, just be aware that the color-theme import path has changed (it can be seen in the very top of the file);
- (Optional) In every file you have, replace local image paths from `{host}/api/images/{fileName}` with `{host}/_api/image/{fileName}`;
- (Optional) In every file you have, replace tags syntax from  `tags: tag one, tag two, etc` with `[tag:tag one] [tag:two]`. The order of the tags does not matter, they can be anywhere in the file;
- (Optional) If you have any custom style, be aware that some CSS custom properties (vars) were replaced. See README to check the new ones.

After doing all that you should have the latest release of Tasks.md running properly.