
package.path = package.path .. ";luajson/?.lua"
local JSON = require"json"

local DEST_FOLDER = "/home/morr/foundry/foundrydata-dev/Data/beneostokens_data/"

local actorDB  ='../packs/beneostokens_TopDown.db.saved'
local fdb = io.open(actorDB)

local function trim1(s)
   return (s:gsub("^%s*(.-)%s*$", "%1"))
end

local line = fdb:read()
while line do 
  --print(line)
  local actor = JSON.decode( line )
  
  local filename = "actor_" .. string.gsub( string.lower(actor.name), " ", "_") .. ".json"
  
  local fpo = io.open(filename, "w+")
  fpo:write(JSON.encode( actor) )
  fpo:close()
  
  line = fdb:read()
end

fdb:close()

