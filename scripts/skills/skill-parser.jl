using JSON, YAML

function addTitle!(dict, skill)
  title = "[frametitle=$(skill["name"])"
  if "type" ∈ keys(skill)
    title *= " ($(skill["type"]))"
  end
  if "levels" ∈ keys(skill)
    title *= " \\\\\\phantom{a}\\hfill Levels: $(skill["levels"])"
  end
  title *= "]"
  dict["%title"] = title
end

function addOptions!(dict)
  dict["%options"] = "\t\\setlength{\\parskip}{8pt}\n\t\\setlength{\\parindent}{0pt}"
end

function addText!(dict, enDir, skill)
  text = "\t" * enDir[uppercase(skill["name"])]
  text = replace(text, "<br />" => "\n\n\t")
  dict["%text"] = text * "\\\\\n"
end

function addCostRequirement!(dict, skill)
  levels = "levels" ∈ keys(skill) ? skill["levels"] : 1
  table = "\t\\begin{tabular}{r$("r"^levels)}\n"

  if levels > 1
    table *= "\t\t"
    for level ∈ 1:levels
      table *= "& Level $level "
    end
    table *= "\\\\\n"
  end

  table *= "\t\tCosts: "
  costString = skill["cost"]
  if levels == 1
    table *= "& $costString \\\\\n"
  else
    if occursin("/", costString)
      costs = replace(costString, " " => "") |> x -> split(x, "/")
    else
      costs = [costString for _ ∈ 1:levels]
    end

    for cost ∈ costs
      table *= "& $cost "
    end
    table *= "\\\\\n"
  end

  if "requirements" ∈ keys(skill)
    table *= "\t\tRequirements: "
    for req ∈ skill["requirements"]
      table *= "& $req "
    end
    table *= "\\\\\n"
  end

  table *= "\t\\end{tabular}"
  dict["%costRequirement"] = table
end

let
  cSkills = YAML.load_file("./scripts/skills/combat.yaml")
  enDir = JSON.parsefile("./lang/en.json")["SKILL TEXT"]
  template = read("./scripts/skills/skill_template.tex", String)
  
  open("./docs/combat_skills.tex", "w") do f
    for cSkill ∈ cSkills
      skillText = Dict()
      addTitle!(skillText, cSkill)
      addOptions!(skillText)
      addText!(skillText, enDir, cSkill)
      addCostRequirement!(skillText, cSkill)

      write(f, replace(template, skillText...) * "\n\n")
    end
  end
end