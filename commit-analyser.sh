LASTCOMMIT=$(git log -1 --pretty=%B | cat)

if [[ $LASTCOMMIT =~ feat.* ]]
  then printf '%s\n' "minor"
  else if [[ $LASTCOMMIT =~ fix.* ]]
    then printf '%s\n' "patch"
    fi
  fi
