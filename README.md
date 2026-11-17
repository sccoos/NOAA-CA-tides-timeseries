# California sea level

An Observable Framework and D3 chart of verified NOAA hourly heights at San Diego, Monterey and Point Reyes. Values are trailing means of seven complete 24-hour days, in feet relative to each station's MSL datum. NOAA-inferred values are included. The loader requests December 26 onward and runs at build time; verified data may lag by weeks.

Install Node.js and Python 3, then run `npm install` and `npm run dev`. Run `npm run build` for the static site. The loader uses only Python's standard library and requires access to NOAA's API. Failed NOAA requests fail the build rather than silently publishing incomplete data.

For GitHub Pages, push this project to a repository, select **Settings → Pages → Build and deployment → GitHub Actions**, and push to the default branch. The workflow builds daily as well as on pushes, refreshing the data. Observable's relative asset paths support repository Pages URLs.
