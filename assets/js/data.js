(function () {
  const truthyValues = new Set(["true", "yes", "1"]);
  const siteConfigCacheKey = "portfolio-site-config-v1";
  const csvCachePrefix = "portfolio-csv-v1:";

  function parseCsv(csvText) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    for (let index = 0; index < csvText.length; index += 1) {
      const character = csvText[index];
      const nextCharacter = csvText[index + 1];

      if (character === '"' && inQuotes && nextCharacter === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        inQuotes = !inQuotes;
      } else if (character === "," && !inQuotes) {
        row.push(field);
        field = "";
      } else if ((character === "\n" || character === "\r") && !inQuotes) {
        if (character === "\r" && nextCharacter === "\n") {
          index += 1;
        }

        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += character;
      }
    }

    row.push(field);
    rows.push(row);

    const populatedRows = rows.filter((items) =>
      items.some((item) => String(item).trim() !== "")
    );

    if (populatedRows.length === 0) {
      return [];
    }

    const headers = populatedRows
      .shift()
      .map((header, index) => (index === 0 ? header.replace(/^\uFEFF/, "") : header).trim());

    return populatedRows.map((items) =>
      headers.reduce((entry, header, index) => {
        entry[header] = String(items[index] || "").trim();
        return entry;
      }, {})
    );
  }

  function resolveSourceUrl(source) {
    if (/^https?:\/\//i.test(source)) {
      return source;
    }

    const rootPrefix = document.body.dataset.rootPrefix || ".";
    return `${rootPrefix}/${String(source).replace(/^\.?\//, "")}`;
  }

  function csvCacheKey(sourceUrl) {
    return `${csvCachePrefix}${sourceUrl}`;
  }

  function readCachedCsv(sourceUrl) {
    try {
      const cachedRows = JSON.parse(sessionStorage.getItem(csvCacheKey(sourceUrl)));
      return Array.isArray(cachedRows) ? cachedRows : null;
    } catch (error) {
      return null;
    }
  }

  function cacheCsv(sourceUrl, rows) {
    try {
      sessionStorage.setItem(csvCacheKey(sourceUrl), JSON.stringify(rows));
    } catch (error) {
      console.warn("CSV data could not be cached for this session.", error);
    }
  }

  async function fetchCsv(source) {
    if (!source) {
      throw new Error("A CSV data source has not been configured.");
    }

    const sourceUrl = resolveSourceUrl(source);
    const cachedRows = readCachedCsv(sourceUrl);

    if (cachedRows) {
      return cachedRows;
    }

    const response = await fetch(sourceUrl, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`The CSV request failed with status ${response.status}.`);
    }

    const rows = parseCsv(await response.text());
    cacheCsv(sourceUrl, rows);
    return rows;
  }

  function isVisible(value) {
    return truthyValues.has(String(value || "").trim().toLowerCase());
  }

  function visibleAndSorted(rows) {
    return rows
      .filter((row) => isVisible(row.visible))
      .map((row, index) => ({ ...row, _sourceIndex: index }))
      .sort((first, second) => {
        const firstOrder = String(first.order || "").trim()
          ? Number(first.order)
          : Number.NaN;
        const secondOrder = String(second.order || "").trim()
          ? Number(second.order)
          : Number.NaN;
        const safeFirstOrder = Number.isFinite(firstOrder) ? firstOrder : Number.MAX_SAFE_INTEGER;
        const safeSecondOrder = Number.isFinite(secondOrder)
          ? secondOrder
          : Number.MAX_SAFE_INTEGER;

        return safeFirstOrder - safeSecondOrder || first._sourceIndex - second._sourceIndex;
      });
  }

  function splitList(value) {
    return String(value || "")
      .split(/[|,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function uniqueValues(values) {
    return Array.from(
      new Map(
        values
          .filter(Boolean)
          .map((value) => [String(value).trim().toLowerCase(), String(value).trim()])
      ).values()
    ).sort((first, second) => first.localeCompare(second, "en"));
  }

  function readCachedSiteConfig() {
    try {
      const cachedProfile = JSON.parse(localStorage.getItem(siteConfigCacheKey));
      return cachedProfile && typeof cachedProfile === "object" ? cachedProfile : null;
    } catch (error) {
      return null;
    }
  }

  function cacheSiteConfig(profile) {
    try {
      localStorage.setItem(siteConfigCacheKey, JSON.stringify(profile));
    } catch (error) {
      console.warn("SiteConfig could not be cached.", error);
    }
  }

  async function loadSiteConfig() {
    const config = window.PORTFOLIO_CONFIG || {};
    const fallbackProfile = { ...(config.profile || {}) };
    const cachedProfile = readCachedSiteConfig();

    try {
      const rows = await fetchCsv(config.dataSources && config.dataSources.siteConfig);

      if (
        rows.length > 0 &&
        !Object.prototype.hasOwnProperty.call(rows[0], "value")
      ) {
        throw new Error('SiteConfig must contain the columns "key" and "value".');
      }

      const sheetProfile = rows.reduce((profile, row) => {
        if (row.key) {
          profile[row.key] = row.value || "";
        }
        return profile;
      }, {});

      const profile = { ...fallbackProfile, ...sheetProfile };
      cacheSiteConfig(profile);
      return profile;
    } catch (error) {
      console.warn("SiteConfig could not be loaded.", error);
      return cachedProfile || fallbackProfile;
    }
  }

  window.PortfolioData = {
    fetchCsv,
    isVisible,
    loadSiteConfig,
    parseCsv,
    readCachedSiteConfig,
    splitList,
    uniqueValues,
    visibleAndSorted
  };
})();
