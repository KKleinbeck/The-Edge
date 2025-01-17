using JSON, YAML

function addTitle!(dict, skill)
  name = skill["name"]
  name = replace(name, "&" => "\\&")
  name = replace(name, "," => "{,}")
  title = "{$(name)"

  if "type" ∈ keys(skill)
    title *= " ($(skill["type"]))"
  end
  if "levels" ∈ keys(skill)
    title *= " \\\\\\phantom{a}\\hfill Levels: $(skill["levels"])"
  end
  title *= "}"
  dict["%title"] = title
end

function addOptions!(dict)
  dict["%options"] = "\t\\setlength{\\parskip}{8pt}\n\t\\setlength{\\parindent}{0pt}"
end

function addText!(dict, enDir, skill)
  text = "\t" * enDir[uppercase(skill["name"])]
  text = replace(text, "<br />" => "\n\n\t")
  text = replace(text, "%" => "\\%")
  dict["%text"] = text * "\n"
end

function addCostRequirement!(dict, skill)
  if "levels" ∈ keys(skill)
    if skill["cost"] isa Number && !("requirements" ∈ keys(skill))
      levels = 1
    else
      levels = skill["levels"]
    end
  else
    levels = 1
  end
  table = "\t\\hfill\n\t\\begin{tabular}{r$("r"^levels)}\n"

  # if levels > 1
  #   table *= "\t\t"
  #   for level ∈ 1:levels
  #     table *= "& Level $level "
  #   end
  #   table *= "\\\\\n"
  # end

  table *= "\t\tCosts: "
  costString = skill["cost"]
  if levels == 1
    table *= "& $costString \\\\\n"
  else
    if costString isa String && occursin("/", costString)
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
    nameSanitise(name) = return replace(name, "&" => "\\&")
    levelSanitise(level) = return isnothing(level) ? "" : level
    for requirement ∈ skill["requirements"]
      reqName = requirement |> keys |> first
      table *= "\t\t$(nameSanitise(reqName)): "
      if levels == 1
        table *= "& $(levelSanitise(requirement[reqName])) "
      else
        for level ∈ requirement[reqName]
          table *= "& $(levelSanitise(level)) "
        end
      end
      table *= "\\\\\n"
    end
  end

  table *= "\t\\end{tabular}"
  dict["%costRequirement"] = table
end

let
  template = read("./scripts/skills/skill_template.tex", String)
  enDir = JSON.parsefile("./lang/en.json")["SKILL TEXT"]
  
  for group ∈ ["combat", "general"]
    cSkills = YAML.load_file("./scripts/skills/$group.yaml")
    
    open("./docs/$(group)_skills.tex", "w") do f
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
end