const fs = require('node:fs');
const path = require('node:path');

const packagePath = path.resolve(__dirname, '../node_modules/expo-router/package.json');
const packageInfo = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
if (packageInfo.version !== '57.0.24') {
  throw new Error(`Unexpected expo-router version ${packageInfo.version}; review the linking race patch before applying it.`);
}

const target = path.resolve(__dirname, '../node_modules/expo-router/build/fork/NavigationContainer.js');
const source = fs.readFileSync(target, 'utf8');
const original = `    const [lastUnhandledLink, setLastUnhandledLink] = react_1.default.useState();
    const { getInitialState } = (0, useLinking_1.useLinking)(refContainer, {
        enabled: isLinkingEnabled,
        prefixes: [],
        ...linking,
    }, setLastUnhandledLink);`;

if (source.includes('const pendingUnhandledLinkRef = react_1.default.useRef(null);')) {
  process.exit(0);
}
if (!source.includes(original)) {
  throw new Error('Could not find the expected Expo Router linking callback. Review the patch before applying it.');
}

const replacement = `    const [lastUnhandledLink, setLastUnhandledLink] = react_1.default.useState();
    const isMountedRef = react_1.default.useRef(false);
    const pendingUnhandledLinkRef = react_1.default.useRef(null);
    react_1.default.useEffect(() => {
        isMountedRef.current = true;
        if (pendingUnhandledLinkRef.current !== null) {
            setLastUnhandledLink(pendingUnhandledLinkRef.current);
            pendingUnhandledLinkRef.current = null;
        }
        return () => {
            isMountedRef.current = false;
        };
    }, []);
    const handleUnhandledLinking = (path) => {
        if (!isMountedRef.current) {
            pendingUnhandledLinkRef.current = path;
            return;
        }
        setLastUnhandledLink(path);
    };
    const { getInitialState } = (0, useLinking_1.useLinking)(refContainer, {
        enabled: isLinkingEnabled,
        prefixes: [],
        ...linking,
    }, handleUnhandledLinking);`;

fs.writeFileSync(target, source.replace(original, replacement));
