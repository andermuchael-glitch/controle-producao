import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

const marker = "// COSTURA_FILTER_FIX_V1";
if (source.includes(marker)) process.exit(0);

const stateAnchor = '  const [filtroEquipe, setFiltroEquipe] = useState("Todas");';
if (!source.includes(stateAnchor)) throw new Error("NeoCooler: estado do filtro de equipe não encontrado.");

source = source.replace(
  stateAnchor,
  `${stateAnchor}\n\n  // COSTURA_FILTER_FIX_V1\n  // Sempre que entrar na aba Costura, mostrar novamente todas as equipes.\n  useEffect(() => {\n    if (aba === "costura") setFiltroEquipe("Todas");\n  }, [aba]);`
);

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: filtro da Costura resetado para Todas ao entrar na aba.");
